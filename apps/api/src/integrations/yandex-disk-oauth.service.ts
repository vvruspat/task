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
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";
import { hasRequiredYandexDiskScopes } from "./plugins/yandex-disk.integration-plugin.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the OAuth client value at runtime.
import { YandexDiskOAuthClient, YandexDiskOAuthError } from "./yandex-disk-oauth.client.js";
import type { CompleteYandexDiskOAuthInput } from "./yandex-disk-oauth.contracts.js";
import {
  YandexDiskAuthorizationStartDto,
  YandexDiskOAuthCompletionDto,
} from "./yandex-disk-oauth.dto.js";

const yandexDiskPluginKey = "yandex-disk";
const oauthStateLifetimeMs = 10 * 60_000;

type ConsumedOAuthState = {
  integrationId: string;
  workspaceId: string;
};

@Injectable()
export class YandexDiskOAuthService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly configProvider: IntegrationsConfigProvider,
    private readonly oauthClient: YandexDiskOAuthClient,
    private readonly secretProvider: DatabaseIntegrationSecretProvider,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async start(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<YandexDiskAuthorizationStartDto> {
    this.assertSecretsConfigured();
    const state = randomBytes(32).toString("base64url");
    const authorizationUrl = this.oauthClient.createAuthorizationUrl(state);
    const now = new Date();
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      const repository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await repository.findOneBy({ id: integrationId, workspaceId });
      if (integration === null || integration.pluginKey !== yandexDiskPluginKey) {
        throw new NotFoundException("Yandex Disk workspace integration was not found.");
      }
      if (integration.status === "connected") {
        throw new ConflictException("Yandex Disk is already connected.");
      }
      await manager
        .getRepository(IntegrationOAuthStateEntity)
        .update(
          { consumedAt: IsNull(), workspaceIntegrationId: integrationId },
          { consumedAt: now },
        );
      await manager.getRepository(IntegrationOAuthStateEntity).save(
        manager.getRepository(IntegrationOAuthStateEntity).create({
          expiresAt: new Date(now.getTime() + oauthStateLifetimeMs),
          pluginKey: yandexDiskPluginKey,
          stateHash: hashYandexDiskOAuthState(state),
          userId,
          workspaceIntegrationId: integrationId,
        }),
      );
      integration.status = "authorizing";
      integration.lastError = null;
      await repository.save(integration);
    });
    return new YandexDiskAuthorizationStartDto({ authorizationUrl });
  }

  async complete(
    input: CompleteYandexDiskOAuthInput,
    userId: string,
  ): Promise<YandexDiskOAuthCompletionDto> {
    const consumedState = await this.consumeOAuthState(input.state, userId);
    try {
      const grant = await this.oauthClient.exchangeCode(input.code);
      if (!hasRequiredYandexDiskScopes(grant.scopes)) {
        throw new YandexDiskOAuthError("Yandex Disk did not grant the required scopes.");
      }
      const userInfo = await this.oauthClient.readUserInfo(grant.accessToken);
      const connectedAt = new Date();
      const dataSource = await this.getInitializedDataSource();
      await dataSource.transaction(async (manager) => {
        const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
        const integration = await integrationRepository
          .createQueryBuilder("integration")
          .where("integration.id = :integrationId", { integrationId: consumedState.integrationId })
          .setLock("pessimistic_write")
          .getOne();
        if (
          integration === null ||
          integration.workspaceId !== consumedState.workspaceId ||
          integration.pluginKey !== yandexDiskPluginKey
        ) {
          throw new NotFoundException("Yandex Disk workspace integration was not found.");
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
        connection.displayName = userInfo.displayName;
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
          payload: { pluginKey: yandexDiskPluginKey },
          workspaceId: integration.workspaceId,
        });
      });
      return new YandexDiskOAuthCompletionDto({
        integrationId: consumedState.integrationId,
        pluginKey: yandexDiskPluginKey,
        status: "connected",
        workspaceId: consumedState.workspaceId,
      });
    } catch (error: unknown) {
      await this.markAuthorizationFailed(consumedState).catch(() => undefined);
      if (error instanceof YandexDiskOAuthError) {
        throw new BadGatewayException("Yandex Disk authorization failed.");
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
        .where("oauthState.stateHash = :stateHash", { stateHash: hashYandexDiskOAuthState(state) })
        .setLock("pessimistic_write")
        .getOne();
      const now = new Date();
      if (
        oauthState === null ||
        oauthState.userId !== userId ||
        oauthState.pluginKey !== yandexDiskPluginKey ||
        oauthState.consumedAt !== null ||
        oauthState.expiresAt <= now
      ) {
        throw new BadRequestException("Yandex Disk OAuth state is invalid or expired.");
      }
      const integration = await manager
        .getRepository(WorkspaceIntegrationEntity)
        .findOneBy({ id: oauthState.workspaceIntegrationId });
      if (integration === null || integration.pluginKey !== yandexDiskPluginKey) {
        throw new BadRequestException("Yandex Disk OAuth state is invalid or expired.");
      }
      await assertWorkspaceManager(manager, integration.workspaceId, userId);
      oauthState.consumedAt = now;
      await stateRepository.save(oauthState);
      return { integrationId: integration.id, workspaceId: integration.workspaceId };
    });
  }

  private async markAuthorizationFailed(state: ConsumedOAuthState): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .update(
        { id: state.integrationId, status: "authorizing" },
        { lastError: "Yandex Disk authorization failed.", status: "error" },
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

export function hashYandexDiskOAuthState(state: string): string {
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
