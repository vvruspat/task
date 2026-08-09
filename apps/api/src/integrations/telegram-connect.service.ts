import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { type DataSource, type EntityManager, In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationOAuthStateEntity,
  TelegramChatEntity,
  TelegramConnectIntentEntity,
  TelegramIdentityEntity,
  WorkspaceEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { TelegramBrowserConnectConfigProvider } from "./telegram-browser-connect.config.js";
import type {
  CompleteTelegramBrowserConnectInput,
  CompleteTelegramChatConnectionInput,
  CreateTelegramBrowserConnectIntentInput,
  TelegramBrowserConnectAuthInput,
  TelegramBrowserConnectWorkspace,
} from "./telegram-connect.contracts.js";
import {
  TelegramBrowserConnectIntentDto,
  TelegramBrowserConnectPreviewDto,
  TelegramBrowserConnectResultDto,
  TelegramChatConnectionDto,
  TelegramConnectTokenDto,
} from "./telegram-connect.dto.js";
import { verifyTelegramLoginAuthData } from "./telegram-login-auth.js";

const telegramPluginKey = "telegram";
const connectTokenLifetimeMs = 10 * 60_000;
const applicationBotSecretReference = "application:telegram-bot";
const connectTokenPattern = /^[A-Za-z0-9_-]{43}$/u;

@Injectable()
export class TelegramConnectService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
    private readonly browserConfigProvider: TelegramBrowserConnectConfigProvider,
  ) {}

  async createBrowserConnectIntent(
    input: CreateTelegramBrowserConnectIntentInput,
  ): Promise<TelegramBrowserConnectIntentDto> {
    const { botToken, webAppUrl } = this.browserConfigProvider.getConfig();
    if (botToken === null || webAppUrl === null) {
      throw new ServiceUnavailableException("Telegram browser connection is not configured.");
    }
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + connectTokenLifetimeMs);
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(TelegramConnectIntentEntity);
      await repository.update(
        {
          consumedAt: IsNull(),
          telegramChatId: input.telegramChatId,
          telegramId: input.telegramId,
        },
        { consumedAt: now },
      );
      await repository.save(
        repository.create({
          consumedAt: null,
          expiresAt,
          telegramChatId: input.telegramChatId,
          telegramId: input.telegramId,
          title: input.title,
          tokenHash: hashConnectToken(token),
        }),
      );
    });
    return new TelegramBrowserConnectIntentDto({
      expiresAt,
      loginUrl: `${webAppUrl}/telegram/connect/${token}`,
    });
  }

  async previewBrowserConnection(
    token: string,
    input: TelegramBrowserConnectAuthInput,
    userId: string,
  ): Promise<TelegramBrowserConnectPreviewDto> {
    const identity = this.verifyBrowserAuth(input.authData);
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const intent = await this.readActiveBrowserIntent(manager, token, identity.telegramId, false);
      const chat = await manager
        .getRepository(TelegramChatEntity)
        .findOneBy({ telegramChatId: intent.telegramChatId });
      if (chat !== null) {
        await assertWorkspaceMember(manager, chat.workspaceId, userId);
        const workspace = await readWorkspace(manager, chat.workspaceId);
        return new TelegramBrowserConnectPreviewDto({
          chatTitle: intent.title,
          expiresAt: intent.expiresAt,
          mode: "link_identity",
          workspace,
          workspaces: [],
        });
      }
      const workspaces = await listManageableTelegramWorkspaces(manager, userId);
      return new TelegramBrowserConnectPreviewDto({
        chatTitle: intent.title,
        expiresAt: intent.expiresAt,
        mode: "connect_chat",
        workspace: null,
        workspaces,
      });
    });
  }

  async completeBrowserConnection(
    token: string,
    input: CompleteTelegramBrowserConnectInput,
    userId: string,
  ): Promise<TelegramBrowserConnectResultDto> {
    const loginIdentity = this.verifyBrowserAuth(input.authData);
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const intent = await this.readActiveBrowserIntent(
        manager,
        token,
        loginIdentity.telegramId,
        true,
      );
      const now = new Date();
      const identity = await pairAndPersistTelegramIdentity(manager, {
        firstName: loginIdentity.firstName,
        lastName: loginIdentity.lastName,
        now,
        telegramId: loginIdentity.telegramId,
        telegramUsername: loginIdentity.username,
        userId,
      });
      const existingChat = await manager
        .getRepository(TelegramChatEntity)
        .findOneBy({ telegramChatId: intent.telegramChatId });
      if (existingChat !== null) {
        if (input.workspaceId !== undefined && input.workspaceId !== existingChat.workspaceId) {
          throw new ConflictException(
            "This Telegram chat is already connected to another workspace.",
          );
        }
        await assertWorkspaceMember(manager, existingChat.workspaceId, userId);
        const workspace = await readWorkspace(manager, existingChat.workspaceId);
        intent.consumedAt = now;
        await manager.getRepository(TelegramConnectIntentEntity).save(intent);
        return new TelegramBrowserConnectResultDto({
          chatTitle: intent.title,
          status: "identity_linked",
          workspace,
        });
      }
      if (input.workspaceId === undefined) {
        throw new BadRequestException("A workspace must be selected for this Telegram chat.");
      }
      await assertWorkspaceManager(manager, input.workspaceId, userId);
      const integration = await manager.getRepository(WorkspaceIntegrationEntity).findOneBy({
        pluginKey: telegramPluginKey,
        workspaceId: input.workspaceId,
      });
      if (integration === null) {
        throw new NotFoundException("Telegram workspace integration was not found.");
      }
      await connectTelegramChat(manager, {
        actorUserId: identity.userId,
        integration,
        now,
        telegramChatId: intent.telegramChatId,
        title: intent.title,
      });
      intent.consumedAt = now;
      await manager.getRepository(TelegramConnectIntentEntity).save(intent);
      await this.publishTelegramConnection(
        manager,
        identity.userId,
        integration.id,
        integration.workspaceId,
        intent.telegramChatId,
        now,
      );
      const workspace = await readWorkspace(manager, integration.workspaceId);
      return new TelegramBrowserConnectResultDto({
        chatTitle: intent.title,
        status: "chat_connected",
        workspace,
      });
    });
  }

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
      if (integration.status !== "connected") {
        integration.status = "authorizing";
      }
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
      const identity = await pairAndPersistTelegramIdentity(manager, {
        firstName: null,
        lastName: null,
        now,
        telegramId: input.telegramId,
        telegramUsername: null,
        userId: state.userId,
      });
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
      const existingChat = await manager
        .getRepository(TelegramChatEntity)
        .findOneBy({ telegramChatId: input.telegramChatId });
      if (existingChat !== null && existingChat.workspaceId !== integration.workspaceId) {
        throw new ConflictException("This Telegram chat is connected to another workspace.");
      }
      await connectTelegramChat(manager, {
        actorUserId: identity.userId,
        integration,
        now,
        telegramChatId: input.telegramChatId,
        title: input.title,
      });
      state.consumedAt = now;
      await stateRepository.save(state);
      await this.publishTelegramConnection(
        manager,
        identity.userId,
        integration.id,
        integration.workspaceId,
        input.telegramChatId,
        now,
      );
      return new TelegramChatConnectionDto({
        integrationId: integration.id,
        status: "connected",
        telegramChatId: input.telegramChatId,
        workspaceId: integration.workspaceId,
      });
    });
  }

  private verifyBrowserAuth(authData: string): ReturnType<typeof verifyTelegramLoginAuthData> {
    const botToken = this.browserConfigProvider.getConfig().botToken;
    if (botToken === null) {
      throw new ServiceUnavailableException("Telegram browser connection is not configured.");
    }
    return verifyTelegramLoginAuthData(authData, botToken);
  }

  private async readActiveBrowserIntent(
    manager: EntityManager,
    token: string,
    telegramId: string,
    lock: boolean,
  ): Promise<TelegramConnectIntentEntity> {
    if (!connectTokenPattern.test(token)) {
      throw new BadRequestException("Telegram connect link is invalid or expired.");
    }
    let query = manager
      .getRepository(TelegramConnectIntentEntity)
      .createQueryBuilder("intent")
      .where("intent.tokenHash = :tokenHash", { tokenHash: hashConnectToken(token) });
    if (lock) query = query.setLock("pessimistic_write");
    const intent = await query.getOne();
    if (
      intent === null ||
      intent.consumedAt !== null ||
      intent.expiresAt <= new Date() ||
      intent.telegramId !== telegramId
    ) {
      throw new BadRequestException("Telegram connect link is invalid or expired.");
    }
    return intent;
  }

  private async publishTelegramConnection(
    manager: EntityManager,
    actorUserId: string,
    integrationId: string,
    workspaceId: string,
    telegramChatId: string,
    now: Date,
  ): Promise<void> {
    await this.outboxPublisher.publishUsingManager(manager, {
      actorUserId,
      entity: { id: integrationId, type: "workspace_integration" },
      id: randomUUID(),
      name: "integration.connected.v1",
      occurredAt: now.toISOString(),
      payload: { pluginKey: telegramPluginKey, telegramChatId },
      workspaceId,
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

type TelegramIdentityPairingInput = {
  firstName?: string | null;
  lastName?: string | null;
  now: Date;
  telegramId: string;
  telegramUsername?: string | null;
  userId: string;
};

export function pairTelegramIdentityForConnection(
  identity: TelegramIdentityEntity | null,
  input: TelegramIdentityPairingInput,
): TelegramIdentityEntity {
  if (identity !== null && identity.userId !== input.userId) {
    throw new ForbiddenException("This Telegram account is linked to another tAsk account.");
  }

  const pairedIdentity = identity ?? new TelegramIdentityEntity();
  pairedIdentity.telegramId = input.telegramId;
  pairedIdentity.userId = input.userId;
  if (input.firstName !== undefined && input.firstName !== null) {
    pairedIdentity.firstName = input.firstName;
  }
  if (input.lastName !== undefined && input.lastName !== null) {
    pairedIdentity.lastName = input.lastName;
  }
  if (input.telegramUsername !== undefined && input.telegramUsername !== null) {
    pairedIdentity.telegramUsername = input.telegramUsername;
  }
  pairedIdentity.lastSeenAt = input.now;
  if (identity === null) pairedIdentity.linkedAt = input.now;
  return pairedIdentity;
}

async function pairAndPersistTelegramIdentity(
  manager: EntityManager,
  input: TelegramIdentityPairingInput,
): Promise<TelegramIdentityEntity> {
  const repository = manager.getRepository(TelegramIdentityEntity);
  const candidate = pairTelegramIdentityForConnection(null, input);
  await repository
    .createQueryBuilder()
    .insert()
    .into(TelegramIdentityEntity)
    .values(candidate)
    .orIgnore()
    .execute();
  const stored = await repository.findOneBy({ telegramId: input.telegramId });
  if (stored === null) {
    throw new ServiceUnavailableException("Telegram identity pairing could not be persisted.");
  }
  const identity = pairTelegramIdentityForConnection(stored, input);
  return await repository.save(identity);
}

type ConnectTelegramChatInput = {
  actorUserId: string;
  integration: WorkspaceIntegrationEntity;
  now: Date;
  telegramChatId: string;
  title: string | null;
};

async function connectTelegramChat(
  manager: EntityManager,
  input: ConnectTelegramChatInput,
): Promise<void> {
  const chatRepository = manager.getRepository(TelegramChatEntity);
  const existingChat = await chatRepository.findOneBy({ telegramChatId: input.telegramChatId });
  if (existingChat !== null && existingChat.workspaceId !== input.integration.workspaceId) {
    throw new ConflictException("This Telegram chat is connected to another workspace.");
  }
  const chat = existingChat ?? chatRepository.create();
  chat.linkedByUserId = input.actorUserId;
  chat.telegramChatId = input.telegramChatId;
  chat.title = input.title;
  chat.workspaceId = input.integration.workspaceId;
  await chatRepository.save(chat);

  const connectionRepository = manager.getRepository(IntegrationConnectionEntity);
  const existingConnection = await connectionRepository.findOneBy({
    providerAccountId: input.telegramChatId,
    workspaceIntegrationId: input.integration.id,
  });
  const connection = existingConnection ?? connectionRepository.create();
  connection.connectedAt = input.now;
  connection.connectedByUserId = input.actorUserId;
  connection.disconnectedAt = null;
  connection.displayName = input.title;
  connection.lastError = null;
  connection.metadata = { telegramChatEntityId: chat.id };
  connection.providerAccountId = input.telegramChatId;
  connection.scopes = [];
  connection.secretReference = applicationBotSecretReference;
  connection.status = "connected";
  connection.workspaceIntegrationId = input.integration.id;
  await connectionRepository.save(connection);

  input.integration.connectedAt = input.now;
  input.integration.connectedByUserId = input.actorUserId;
  input.integration.disconnectedAt = null;
  input.integration.lastError = null;
  input.integration.status = "connected";
  await manager.getRepository(WorkspaceIntegrationEntity).save(input.integration);
}

async function assertWorkspaceMember(
  manager: EntityManager,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await manager
    .getRepository(WorkspaceMemberEntity)
    .findOneBy({ userId, workspaceId });
  if (membership === null) {
    throw new ForbiddenException("Current user does not belong to this chat workspace.");
  }
}

async function readWorkspace(
  manager: EntityManager,
  workspaceId: string,
): Promise<TelegramBrowserConnectWorkspace> {
  const workspace = await manager.getRepository(WorkspaceEntity).findOneBy({ id: workspaceId });
  if (workspace === null) throw new NotFoundException("Workspace was not found.");
  return { id: workspace.id, name: workspace.name, slug: workspace.slug };
}

async function listManageableTelegramWorkspaces(
  manager: EntityManager,
  userId: string,
): Promise<TelegramBrowserConnectWorkspace[]> {
  const memberships = await manager.getRepository(WorkspaceMemberEntity).findBy({
    role: In(["owner", "admin"]),
    userId,
  });
  if (memberships.length === 0) return [];
  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  const integrations = await manager.getRepository(WorkspaceIntegrationEntity).findBy({
    pluginKey: telegramPluginKey,
    workspaceId: In(workspaceIds),
  });
  if (integrations.length === 0) return [];
  const integratedWorkspaceIds = integrations.map((integration) => integration.workspaceId);
  const workspaces = await manager.getRepository(WorkspaceEntity).findBy({
    id: In(integratedWorkspaceIds),
  });
  return workspaces
    .map((workspace) => ({ id: workspace.id, name: workspace.name, slug: workspace.slug }))
    .sort((left, right) => left.name.localeCompare(right.name));
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
