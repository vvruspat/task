import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AgentRunEntity,
  TelegramChatEntity,
  TelegramIdentityEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type {
  AgentRunStore,
  FindTelegramAgentRunInput,
  PersistTelegramAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";

@Injectable()
export class TypeOrmAgentRunStore implements AgentRunStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async resolveTelegramRunContext(
    input: CreateTelegramAgentRunInput,
  ): Promise<TelegramAgentRunContextResult> {
    const dataSource = await this.getInitializedDataSource();
    const identity = await dataSource.getRepository(TelegramIdentityEntity).findOneBy({
      telegramId: input.telegramId,
    });

    if (identity === null) {
      return { status: "telegram_user_unlinked" };
    }

    const chat = await dataSource.getRepository(TelegramChatEntity).findOneBy({
      telegramChatId: input.telegramChatId,
    });

    if (chat === null) {
      return { status: "telegram_chat_unlinked" };
    }

    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId: identity.userId,
      workspaceId: chat.workspaceId,
    });

    if (membership === null) {
      return { status: "user_not_in_chat_workspace" };
    }

    return {
      status: "resolved",
      workspaceId: chat.workspaceId,
      userId: identity.userId,
    };
  }

  async findTelegramRunBySource(input: FindTelegramAgentRunInput): Promise<AgentRunEntity | null> {
    const dataSource = await this.getInitializedDataSource();

    return dataSource.getRepository(AgentRunEntity).findOneBy({
      workspaceId: input.workspaceId,
      userId: input.userId,
      source: "telegram",
      sourceThreadId: input.sourceThreadId,
      sourceMessageId: input.sourceMessageId,
    });
  }

  async createTelegramRun(input: PersistTelegramAgentRunInput): Promise<AgentRunEntity> {
    const dataSource = await this.getInitializedDataSource();
    const repository = dataSource.getRepository(AgentRunEntity);
    const run = repository.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      source: "telegram",
      sourceThreadId: input.sourceThreadId,
      sourceMessageId: input.sourceMessageId,
      model: input.runtimeResult.model,
      inputText: input.inputText,
      normalizedIntent: input.runtimeResult.normalizedIntent,
      finalResponse: input.runtimeResult.finalResponse,
      status: input.runtimeResult.status,
      tokenUsage: input.runtimeResult.tokenUsage,
      cost: input.runtimeResult.cost,
      error: input.runtimeResult.error,
    });
    return repository.save(run);
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}
