import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { type DataSource, type EntityManager, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationOAuthStateEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the secret provider value at runtime.
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the OAuth client value at runtime.
import { GoogleDriveOAuthClient, GoogleDriveOAuthError } from "./google-drive-oauth.client.js";
import type { CompleteGoogleDriveOAuthInput } from "./google-drive-oauth.contracts.js";
import {
  GoogleDriveAuthorizationStartDto,
  GoogleDriveOAuthCompletionDto,
} from "./google-drive-oauth.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";

const googleDrivePluginKey = "google-drive";
const oauthStateLifetimeMs = 10 * 60_000;

type ConsumedOAuthState = {
  integrationId: string;
  userId: string;
  workspaceId: string;
};

@Injectable()
export class GoogleDriveOAuthService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly configProvider: IntegrationsConfigProvider,
    private readonly oauthClient: GoogleDriveOAuthClient,
    private readonly secretProvider: DatabaseIntegrationSecretProvider,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async start(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<GoogleDriveAuthorizationStartDto> {
    this.assertSecretsConfigured();
    const state = randomBytes(32).toString("base64url");
    const authorizationUrl = this.oauthClient.createAuthorizationUrl(state);
    const now = new Date();
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository.findOneBy({ id: integrationId, workspaceId });
      if (integration === null || integration.pluginKey !== googleDrivePluginKey) {
        throw new NotFoundException("Google Drive workspace integration was not found.");
      }
      if (integration.status === "connected") {
        throw new ConflictException("Google Drive is already connected.");
      }
      await manager
        .getRepository(IntegrationOAuthStateEntity)
        .update(
          { consumedAt: IsNull(), workspaceIntegrationId: integrationId },
          { consumedAt: now },
        );
      const oauthState = manager.getRepository(IntegrationOAuthStateEntity).create({
        expiresAt: new Date(now.getTime() + oauthStateLifetimeMs),
        pluginKey: googleDrivePluginKey,
        stateHash: hashOAuthState(state),
        userId,
        workspaceIntegrationId: integrationId,
      });
      await manager.getRepository(IntegrationOAuthStateEntity).save(oauthState);
      integration.status = "authorizing";
      integration.lastError = null;
      await integrationRepository.save(integration);
    });
    return new GoogleDriveAuthorizationStartDto({ authorizationUrl });
  }

  async complete(
    input: CompleteGoogleDriveOAuthInput,
    userId: string,
  ): Promise<GoogleDriveOAuthCompletionDto> {
    const consumedState = await this.consumeOAuthState(input.state, userId);
    try {
      const grant = await this.oauthClient.exchangeCode(input.code);
      const userInfo = await this.oauthClient.readUserInfo(grant.accessToken);
      const connectedAt = new Date();
      const dataSource = await this.getInitializedDataSource();
      await dataSource.transaction(async (manager) => {
        const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
        const integration = await integrationRepository
          .createQueryBuilder("integration")
          .where("integration.id = :integrationId", {
            integrationId: consumedState.integrationId,
          })
          .setLock("pessimistic_write")
          .getOne();
        if (
          integration === null ||
          integration.workspaceId !== consumedState.workspaceId ||
          integration.pluginKey !== googleDrivePluginKey
        ) {
          throw new NotFoundException("Google Drive workspace integration was not found.");
        }
        const connectionRepository = manager.getRepository(IntegrationConnectionEntity);
        const existing = await connectionRepository.findOneBy({
          workspaceIntegrationId: integration.id,
        });
        if (existing !== null) {
          await this.secretProvider.deleteUsingManager(manager, existing.secretReference);
        }
        const secretReference = await this.secretProvider.putUsingManager(
          manager,
          grant.refreshToken,
        );
        const connection = existing ?? connectionRepository.create();
        connection.connectedAt = connectedAt;
        connection.connectedByUserId = userId;
        connection.disconnectedAt = null;
        connection.displayName = userInfo.email;
        connection.lastError = null;
        connection.metadata = {};
        connection.providerAccountId = userInfo.accountId;
        connection.scopes = grant.scopes;
        connection.secretReference = secretReference;
        connection.status = "connected";
        connection.workspaceIntegrationId = integration.id;
        await connectionRepository.save(connection);

        integration.connectedAt = connectedAt;
        integration.connectedByUserId = userId;
        integration.disconnectedAt = null;
        integration.lastError = null;
        integration.status = "connected";
        await integrationRepository.save(integration);
        await this.outboxPublisher.publishUsingManager(manager, {
          actorUserId: userId,
          entity: { id: integration.id, type: "workspace_integration" },
          id: randomUUID(),
          name: "integration.connected.v1",
          occurredAt: connectedAt.toISOString(),
          payload: { pluginKey: googleDrivePluginKey },
          workspaceId: integration.workspaceId,
        });
      });
      return new GoogleDriveOAuthCompletionDto({
        integrationId: consumedState.integrationId,
        pluginKey: googleDrivePluginKey,
        status: "connected",
        workspaceId: consumedState.workspaceId,
      });
    } catch (error: unknown) {
      await this.markAuthorizationFailed(consumedState).catch(() => undefined);
      if (error instanceof GoogleDriveOAuthError) {
        throw new BadGatewayException("Google Drive authorization failed.");
      }
      throw error;
    }
  }

  private assertSecretsConfigured(): void {
    if (this.configProvider.getConfig().secretEncryptionKey === null) {
      throw new ServiceUnavailableException("Integration secret encryption is not configured.");
    }
  }

  private async consumeOAuthState(state: string, userId: string): Promise<ConsumedOAuthState> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const stateRepository = manager.getRepository(IntegrationOAuthStateEntity);
      const oauthState = await stateRepository
        .createQueryBuilder("oauthState")
        .where("oauthState.stateHash = :stateHash", { stateHash: hashOAuthState(state) })
        .setLock("pessimistic_write")
        .getOne();
      const now = new Date();
      if (
        oauthState === null ||
        oauthState.userId !== userId ||
        oauthState.pluginKey !== googleDrivePluginKey ||
        oauthState.consumedAt !== null ||
        oauthState.expiresAt <= now
      ) {
        throw new BadRequestException("Google Drive OAuth state is invalid or expired.");
      }
      const integration = await manager
        .getRepository(WorkspaceIntegrationEntity)
        .findOneBy({ id: oauthState.workspaceIntegrationId });
      if (integration === null || integration.pluginKey !== googleDrivePluginKey) {
        throw new BadRequestException("Google Drive OAuth state is invalid or expired.");
      }
      await assertWorkspaceManager(manager, integration.workspaceId, userId);
      oauthState.consumedAt = now;
      await stateRepository.save(oauthState);
      return {
        integrationId: integration.id,
        userId,
        workspaceId: integration.workspaceId,
      };
    });
  }

  private async markAuthorizationFailed(state: ConsumedOAuthState): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .update(
        { id: state.integrationId, status: "authorizing" },
        { lastError: "Google Drive authorization failed.", status: "error" },
      );
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

export function hashOAuthState(state: string): string {
  return createHash("sha256").update(state, "utf8").digest("hex");
}

async function assertWorkspaceManager(
  manager: EntityManager,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await manager
    .getRepository(WorkspaceMemberEntity)
    .findOneBy({ userId, workspaceId });
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new ForbiddenException("Current user cannot manage workspace integrations.");
  }
}
