import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AgentRunEntity,
  AgentToolCallEntity,
  ConfirmationRequestEntity,
  TelegramChatEntity,
  TelegramIdentityEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import type {
  AgentRunDetailRecord,
  AgentRunStore,
  FindTelegramAgentRunInput,
  PersistTelegramAgentRunInput,
  TelegramAgentRunContextResult,
} from "./agent.store.js";

const agentRunHistoryLimit = 50;

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

  async listForWorkspace(workspaceId: string, userId: string): Promise<AgentRunEntity[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId,
      workspaceId,
    });

    if (membership === null) {
      return null;
    }

    return dataSource.getRepository(AgentRunEntity).find({
      order: {
        createdAt: "DESC",
      },
      take: agentRunHistoryLimit,
      where: {
        userId,
        workspaceId,
      },
    });
  }

  async getDetailForWorkspace(
    workspaceId: string,
    agentRunId: string,
    userId: string,
  ): Promise<AgentRunDetailRecord | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId,
      workspaceId,
    });

    if (membership === null) {
      return null;
    }

    const run = await dataSource.getRepository(AgentRunEntity).findOneBy({
      id: agentRunId,
      userId,
      workspaceId,
    });

    if (run === null) {
      return null;
    }

    const [toolCalls, confirmationRequests] = await Promise.all([
      dataSource.getRepository(AgentToolCallEntity).find({
        order: { createdAt: "ASC" },
        where: { agentRunId: run.id },
      }),
      dataSource.getRepository(ConfirmationRequestEntity).find({
        order: { createdAt: "ASC" },
        where: { agentRunId: run.id, userId, workspaceId },
      }),
    ]);

    return { run, toolCalls, confirmationRequests };
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

    return dataSource.transaction(async (entityManager) => {
      const runRepository = entityManager.getRepository(AgentRunEntity);
      const run = await runRepository.save(
        runRepository.create({
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
        }),
      );

      if (input.runtimeResult.toolCalls.length > 0) {
        const toolCallRepository = entityManager.getRepository(AgentToolCallEntity);
        const toolCalls = input.runtimeResult.toolCalls.map((toolCall) =>
          toolCallRepository.create({
            agentRunId: run.id,
            toolName: toolCall.toolName,
            arguments: toolCall.arguments,
            result: toolCall.result,
            status: toolCall.status,
            error: toolCall.error,
            completedAt: toolCall.completedAt,
          }),
        );

        await toolCallRepository.save(toolCalls);
      }

      return run;
    });
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
