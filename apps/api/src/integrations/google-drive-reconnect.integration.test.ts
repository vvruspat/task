import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";
import type { DataSource } from "typeorm";
import { createApiDataSource } from "../data-source.js";
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationEventDeliveryEntity,
  IntegrationExternalResourceEntity,
  IntegrationOutboxEventEntity,
  UserEntity,
  WorkspaceEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
import { GoogleDriveAccessService } from "./google-drive-access.service.js";
import { GoogleDriveOAuthClient, GoogleDriveOAuthError } from "./google-drive-oauth.client.js";
import { GoogleDriveOAuthService } from "./google-drive-oauth.service.js";
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
import { IntegrationsConfigProvider, parseIntegrationsConfig } from "./integrations.config.js";
import { googleDriveOAuthScopes } from "./plugins/google-drive.integration-plugin.js";

const databaseUrl = process.env["GOOGLE_DRIVE_TEST_DATABASE_URL"];

type Fixture = {
  access: GoogleDriveAccessService;
  connection: IntegrationConnectionEntity;
  integration: WorkspaceIntegrationEntity;
  oauth: GoogleDriveOAuthClient;
  service: GoogleDriveOAuthService;
  userId: string;
  workspaceId: string;
};

test("Google Drive reconnect preserves resources and recovers exports in PostgreSQL", {
  skip: databaseUrl === undefined,
}, async (context) => {
  if (databaseUrl === undefined) throw new Error("A dedicated test database is required.");
  const dataSource = createApiDataSource({ url: databaseUrl });
  await dataSource.initialize();
  context.after(async () => {
    await dataSource.destroy();
  });
  await dataSource.runMigrations();

  await context.test(
    "connected owners can reauthorize without interrupting the current connection",
    async (t) => {
      const fixture = await createFixture(t, dataSource);
      const started = await fixture.service.start(
        fixture.workspaceId,
        fixture.integration.id,
        fixture.userId,
      );
      assert.equal(new URL(started.authorizationUrl).searchParams.get("access_type"), "offline");
      const current = await dataSource
        .getRepository(WorkspaceIntegrationEntity)
        .findOneByOrFail({ id: fixture.integration.id });
      assert.equal(current.status, "connected");
      const stranger = await dataSource.getRepository(UserEntity).save(new UserEntity());
      await assert.rejects(
        fixture.service.start(fixture.workspaceId, fixture.integration.id, stranger.id),
        /cannot manage/u,
      );
    },
  );

  await context.test("revoked refresh grants set actionable connection errors", async (t) => {
    const fixture = await createFixture(t, dataSource);
    t.mock.method(fixture.oauth, "refreshAccessToken", async () => {
      throw new GoogleDriveOAuthError("revoked", true);
    });
    await assert.rejects(
      fixture.access.getAccessGrant(fixture.workspaceId, fixture.integration.id),
      /Reconnect Google Drive/u,
    );
    assert.equal(
      (
        await dataSource
          .getRepository(WorkspaceIntegrationEntity)
          .findOneByOrFail({ id: fixture.integration.id })
      ).status,
      "error",
    );
    assert.equal(
      (
        await dataSource
          .getRepository(IntegrationConnectionEntity)
          .findOneByOrFail({ id: fixture.connection.id })
      ).status,
      "error",
    );
  });

  await context.test(
    "transient Google failures keep the connection available for retry",
    async (t) => {
      const fixture = await createFixture(t, dataSource);
      t.mock.method(fixture.oauth, "refreshAccessToken", async () => {
        throw new GoogleDriveOAuthError("temporarily unavailable");
      });
      await assert.rejects(
        fixture.access.getAccessGrant(fixture.workspaceId, fixture.integration.id),
        /could not be refreshed/u,
      );
      assert.equal(
        (
          await dataSource
            .getRepository(WorkspaceIntegrationEntity)
            .findOneByOrFail({ id: fixture.integration.id })
        ).status,
        "connected",
      );
    },
  );

  await context.test(
    "an old refresh failure cannot invalidate replacement credentials",
    async (t) => {
      const fixture = await createFixture(t, dataSource);
      t.mock.method(fixture.oauth, "refreshAccessToken", async () => {
        await dataSource
          .getRepository(IntegrationConnectionEntity)
          .update(fixture.connection.id, { secretReference: "replacement-credentials" });
        throw new GoogleDriveOAuthError("old revoked grant", true);
      });
      await assert.rejects(
        fixture.access.getAccessGrant(fixture.workspaceId, fixture.integration.id),
      );
      assert.equal(
        (
          await dataSource
            .getRepository(WorkspaceIntegrationEntity)
            .findOneByOrFail({ id: fixture.integration.id })
        ).status,
        "connected",
      );
      assert.equal(
        (
          await dataSource
            .getRepository(IntegrationConnectionEntity)
            .findOneByOrFail({ id: fixture.connection.id })
        ).status,
        "connected",
      );
    },
  );

  await context.test(
    "reauthorization retries failed access and missed attachments, preserving completed and unrelated work",
    async (t) => {
      const fixture = await createFixture(t, dataSource);
      const other = await createFixture(t, dataSource);
      const blocked = await createDelivery(
        dataSource,
        fixture,
        "dead",
        "GoogleDriveAccessError: Google Drive credentials could not be refreshed.",
      );
      const completed = await createDelivery(dataSource, fixture, "succeeded", null);
      const unrelated = await createDelivery(
        dataSource,
        fixture,
        "dead",
        "AttachmentContentUnavailableError: missing content",
      );
      const running = await createDelivery(dataSource, fixture, "processing", null);
      const otherBlocked = await createDelivery(
        dataSource,
        other,
        "dead",
        "GoogleDriveAccessError: revoked",
      );
      const missed = await createAttachmentEvent(dataSource, fixture);
      const folder = await dataSource.getRepository(IntegrationExternalResourceEntity).save(
        dataSource.getRepository(IntegrationExternalResourceEntity).create({
          connectionId: fixture.connection.id,
          providerResourceId: "selected-folder",
          resourceKind: "google-drive.folder",
          name: "Chosen folder",
        }),
      );
      const oldSecret = fixture.connection.secretReference;
      await reconnect(fixture);
      const deliveries = dataSource.getRepository(IntegrationEventDeliveryEntity);
      const retried = await deliveries.findOneByOrFail({ id: blocked.id });
      assert.equal(retried.status, "pending");
      assert.equal(retried.attemptCount, 0);
      assert.equal(retried.lastError, null);
      assert.equal((await deliveries.findOneByOrFail({ id: completed.id })).status, "succeeded");
      assert.equal((await deliveries.findOneByOrFail({ id: unrelated.id })).status, "dead");
      assert.equal((await deliveries.findOneByOrFail({ id: running.id })).status, "processing");
      assert.equal((await deliveries.findOneByOrFail({ id: otherBlocked.id })).status, "dead");
      assert.equal(
        (
          await deliveries.findOneByOrFail({
            outboxEventId: missed.id,
            workspaceIntegrationId: fixture.integration.id,
          })
        ).status,
        "pending",
      );
      const connection = await dataSource
        .getRepository(IntegrationConnectionEntity)
        .findOneByOrFail({ id: fixture.connection.id });
      assert.notEqual(connection.secretReference, oldSecret);
      assert.equal(connection.status, "connected");
      assert.ok(
        await dataSource
          .getRepository(IntegrationExternalResourceEntity)
          .findOneBy({ id: folder.id }),
      );
      const installation = await dataSource
        .getRepository(WorkspaceIntegrationEntity)
        .findOneByOrFail({ id: fixture.integration.id });
      assert.deepEqual(installation.config, fixture.integration.config);
      await deliveries.update(blocked.id, { status: "succeeded", attemptCount: 1 });
      await reconnect(fixture);
      assert.equal((await deliveries.findOneByOrFail({ id: blocked.id })).status, "succeeded");
      assert.equal(
        await deliveries.countBy({
          outboxEventId: missed.id,
          workspaceIntegrationId: fixture.integration.id,
        }),
        1,
      );
    },
  );

  await context.test(
    "a different Google account cannot take over existing folder mappings",
    async (t) => {
      const fixture = await createFixture(t, dataSource);
      t.mock.method(fixture.oauth, "readUserInfo", async () => ({
        accountId: "different-account",
        email: null,
      }));
      await assert.rejects(reconnect(fixture), /same Google account/u);
      const connection = await dataSource
        .getRepository(IntegrationConnectionEntity)
        .findOneByOrFail({ id: fixture.connection.id });
      assert.equal(connection.secretReference, fixture.connection.secretReference);
      assert.equal(connection.providerAccountId, fixture.connection.providerAccountId);
    },
  );
});

async function createFixture(context: TestContext, dataSource: DataSource): Promise<Fixture> {
  const user = await dataSource
    .getRepository(UserEntity)
    .save(dataSource.getRepository(UserEntity).create({ displayName: "Test owner" }));
  const workspace = await dataSource
    .getRepository(WorkspaceEntity)
    .save(
      dataSource
        .getRepository(WorkspaceEntity)
        .create({ name: "Test", slug: `drive-${randomUUID()}` }),
    );
  await dataSource
    .getRepository(WorkspaceMemberEntity)
    .save(
      dataSource
        .getRepository(WorkspaceMemberEntity)
        .create({ workspaceId: workspace.id, userId: user.id, role: "owner" }),
    );
  const integration = await dataSource.getRepository(WorkspaceIntegrationEntity).save(
    dataSource.getRepository(WorkspaceIntegrationEntity).create({
      workspaceId: workspace.id,
      pluginKey: "google-drive",
      pluginVersion: "0.1.0",
      installedByUserId: user.id,
      status: "connected",
      config: { rootFolder: { providerResourceId: "chosen-folder" } },
    }),
  );
  const provider = new ApiDataSourceProvider();
  context.mock.method(provider, "getDataSource", () => dataSource);
  const config = new IntegrationsConfigProvider();
  context.mock.method(config, "getConfig", () =>
    parseIntegrationsConfig({
      GOOGLE_DRIVE_CLIENT_ID: "test-client",
      GOOGLE_DRIVE_CLIENT_SECRET: "test-secret",
      GOOGLE_DRIVE_REDIRECT_URI: "https://example.com/callback",
      INTEGRATION_SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    }),
  );
  const secrets = new DatabaseIntegrationSecretProvider(provider, config);
  const secretReference = await secrets.put("old-refresh-token");
  const connection = await dataSource.getRepository(IntegrationConnectionEntity).save(
    dataSource.getRepository(IntegrationConnectionEntity).create({
      workspaceIntegrationId: integration.id,
      connectedByUserId: user.id,
      providerAccountId: "same-google-account",
      scopes: [...googleDriveOAuthScopes],
      secretReference,
    }),
  );
  const oauth = new GoogleDriveOAuthClient(config);
  context.mock.method(oauth, "exchangeCode", async () => ({
    accessToken: "test-access",
    expiresInSeconds: 3600,
    refreshToken: "new-refresh-token",
    scopes: [...googleDriveOAuthScopes],
  }));
  context.mock.method(oauth, "readUserInfo", async () => ({
    accountId: "same-google-account",
    email: null,
  }));
  return {
    access: new GoogleDriveAccessService(provider, oauth, secrets),
    connection,
    integration,
    oauth,
    service: new GoogleDriveOAuthService(
      provider,
      config,
      oauth,
      secrets,
      new IntegrationOutboxPublisher(provider),
    ),
    userId: user.id,
    workspaceId: workspace.id,
  };
}

async function reconnect(fixture: Fixture): Promise<void> {
  const start = await fixture.service.start(
    fixture.workspaceId,
    fixture.integration.id,
    fixture.userId,
  );
  const state = new URL(start.authorizationUrl).searchParams.get("state");
  assert.ok(state);
  await fixture.service.complete({ code: "fixture-code", state }, fixture.userId);
}

async function createAttachmentEvent(
  dataSource: DataSource,
  fixture: Fixture,
): Promise<IntegrationOutboxEventEntity> {
  const repository = dataSource.getRepository(IntegrationOutboxEventEntity);
  return repository.save(
    repository.create({
      entityId: randomUUID(),
      entityType: "attachment",
      eventName: "attachment.created.v1",
      occurredAt: new Date(),
      publishedAt: new Date(),
      workspaceId: fixture.workspaceId,
    }),
  );
}

async function createDelivery(
  dataSource: DataSource,
  fixture: Fixture,
  status: IntegrationEventDeliveryEntity["status"],
  lastError: string | null,
): Promise<IntegrationEventDeliveryEntity> {
  const event = await createAttachmentEvent(dataSource, fixture);
  const repository = dataSource.getRepository(IntegrationEventDeliveryEntity);
  return repository.save(
    repository.create({
      outboxEventId: event.id,
      workspaceIntegrationId: fixture.integration.id,
      pluginKey: "google-drive",
      pluginVersion: "0.1.0",
      status,
      lastError,
      attemptCount: 8,
    }),
  );
}
