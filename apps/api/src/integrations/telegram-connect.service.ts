import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
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
  TelegramChatEntity,
  TelegramIdentityEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
import type { CompleteTelegramChatConnectionInput } from "./telegram-connect.contracts.js";
import { TelegramChatConnectionDto, TelegramConnectTokenDto } from "./telegram-connect.dto.js";

const telegramPluginKey = "telegram";
const connectTokenLifetimeMs = 10 * 60_000;
const applicationBotSecretReference = "application:telegram-bot";

@Injectable()
export class TelegramConnectService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async createConnectToken(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<TelegramConnectTokenDto> {
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + connectTokenLifetimeMs);
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository.findOneBy({ id: integrationId, workspaceId });
      if (integration === null || integration.pluginKey !== telegramPluginKey) {
        throw new NotFoundException("Telegram workspace integration was not found.");
      }
      if (integration.status === "connected") {
        throw new ConflictException("Telegram is already connected.");
      }
      await manager
        .getRepository(IntegrationOAuthStateEntity)
        .update(
          { consumedAt: IsNull(), workspaceIntegrationId: integration.id },
          { consumedAt: now },
        );
      await manager.getRepository(IntegrationOAuthStateEntity).save(
        manager.getRepository(IntegrationOAuthStateEntity).create({
          expiresAt,
          pluginKey: telegramPluginKey,
          stateHash: hashConnectToken(token),
          userId,
          workspaceIntegrationId: integration.id,
        }),
      );
      integration.lastError = null;
      integration.status = "authorizing";
      await integrationRepository.save(integration);
    });
    return new TelegramConnectTokenDto({ command: `/connect ${token}`, expiresAt });
  }

  async completeConnection(
    input: CompleteTelegramChatConnectionInput,
  ): Promise<TelegramChatConnectionDto> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const stateRepository = manager.getRepository(IntegrationOAuthStateEntity);
      const state = await stateRepository
        .createQueryBuilder("state")
        .where("state.stateHash = :stateHash", { stateHash: hashConnectToken(input.token) })
        .setLock("pessimistic_write")
        .getOne();
      const now = new Date();
      if (
        state === null ||
        state.pluginKey !== telegramPluginKey ||
        state.consumedAt !== null ||
        state.expiresAt <= now
      ) {
        throw new BadRequestException("Telegram connect token is invalid or expired.");
      }
      const identity = await manager.getRepository(TelegramIdentityEntity).findOneBy({
        telegramId: input.telegramId,
      });
      if (identity === null || identity.userId !== state.userId) {
        throw new ForbiddenException("Telegram identity does not own this connect token.");
      }
      identity.lastSeenAt = now;
      await manager.getRepository(TelegramIdentityEntity).save(identity);
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository
        .createQueryBuilder("integration")
        .where("integration.id = :integrationId", { integrationId: state.workspaceIntegrationId })
        .setLock("pessimistic_write")
        .getOne();
      if (integration === null || integration.pluginKey !== telegramPluginKey) {
        throw new BadRequestException("Telegram connect token is invalid or expired.");
      }
      await assertWorkspaceManager(manager, integration.workspaceId, identity.userId);
      if (integration.status === "connected") {
        throw new ConflictException("Telegram is already connected.");
      }

      const chatRepository = manager.getRepository(TelegramChatEntity);
      const existingChat = await chatRepository.findOneBy({ telegramChatId: input.telegramChatId });
      if (existingChat !== null && existingChat.workspaceId !== integration.workspaceId) {
        throw new ConflictException("This Telegram chat is connected to another workspace.");
      }
      const chat = existingChat ?? chatRepository.create();
      chat.linkedByUserId = identity.userId;
      chat.telegramChatId = input.telegramChatId;
      chat.title = input.title;
      chat.workspaceId = integration.workspaceId;
      await chatRepository.save(chat);

      const connectionRepository = manager.getRepository(IntegrationConnectionEntity);
      const existingConnection = await connectionRepository.findOneBy({
        workspaceIntegrationId: integration.id,
      });
      const connection = existingConnection ?? connectionRepository.create();
      connection.connectedAt = now;
      connection.connectedByUserId = identity.userId;
      connection.disconnectedAt = null;
      connection.displayName = input.title;
      connection.lastError = null;
      connection.metadata = { telegramChatEntityId: chat.id };
      connection.providerAccountId = input.telegramChatId;
      connection.scopes = [];
      connection.secretReference = applicationBotSecretReference;
      connection.status = "connected";
      connection.workspaceIntegrationId = integration.id;
      await connectionRepository.save(connection);

      integration.connectedAt = now;
      integration.connectedByUserId = identity.userId;
      integration.disconnectedAt = null;
      integration.lastError = null;
      integration.status = "connected";
      await integrationRepository.save(integration);
      state.consumedAt = now;
      await stateRepository.save(state);
      await this.outboxPublisher.publishUsingManager(manager, {
        actorUserId: identity.userId,
        entity: { id: integration.id, type: "workspace_integration" },
        id: randomUUID(),
        name: "integration.connected.v1",
        occurredAt: now.toISOString(),
        payload: { pluginKey: telegramPluginKey, telegramChatId: input.telegramChatId },
        workspaceId: integration.workspaceId,
      });
      return new TelegramChatConnectionDto({
        integrationId: integration.id,
        status: "connected",
        telegramChatId: input.telegramChatId,
        workspaceId: integration.workspaceId,
      });
    });
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

export function hashConnectToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
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
