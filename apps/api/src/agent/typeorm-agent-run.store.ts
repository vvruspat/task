import { randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AgentChatEntity,
  AgentChatMessageEntity,
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
  PersistedWebChatTurn,
  PersistTelegramAgentRunInput,
  PersistWebAgentRunInput,
  PersistWebChatTurnInput,
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

  async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      userId,
      workspaceId,
    });
    return membership !== null;
  }

  async listChats(
    workspaceId: string,
    userId: string,
    query: string,
  ): Promise<AgentChatEntity[] | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.isWorkspaceMember(workspaceId, userId))) return null;
    const builder = dataSource
      .getRepository(AgentChatEntity)
      .createQueryBuilder("chat")
      .where("chat.workspace_id = :workspaceId", { workspaceId })
      .andWhere("chat.user_id = :userId", { userId })
      .orderBy("chat.updated_at", "DESC")
      .take(agentRunHistoryLimit);
    if (query.length > 0) builder.andWhere("chat.title ILIKE :query", { query: `%${query}%` });
    return builder.getMany();
  }

  async getChat(
    workspaceId: string,
    chatId: string,
    userId: string,
  ): Promise<{ chat: AgentChatEntity; messages: AgentChatMessageEntity[] } | null> {
    const dataSource = await this.getInitializedDataSource();
    const chat = await dataSource.getRepository(AgentChatEntity).findOneBy({
      id: chatId,
      userId,
      workspaceId,
    });
    if (chat === null) return null;
    const messages = await dataSource.getRepository(AgentChatMessageEntity).find({
      order: { createdAt: "ASC" },
      where: { chatId },
    });
    return { chat, messages };
  }

  async updateChatTitle(
    workspaceId: string,
    chatId: string,
    userId: string,
    title: string,
  ): Promise<AgentChatEntity | null> {
    const dataSource = await this.getInitializedDataSource();
    const repository = dataSource.getRepository(AgentChatEntity);
    const chat = await repository.findOneBy({ id: chatId, userId, workspaceId });
    if (chat === null) return null;
    chat.title = title;
    chat.updatedAt = new Date();
    return repository.save(chat);
  }

  async deleteChat(
    workspaceId: string,
    chatId: string,
    userId: string,
  ): Promise<AgentChatEntity | null> {
    const dataSource = await this.getInitializedDataSource();
    const repository = dataSource.getRepository(AgentChatEntity);
    const chat = await repository.findOneBy({ id: chatId, userId, workspaceId });
    if (chat === null) return null;
    await repository.remove(chat);
    return chat;
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
    return this.createRun("telegram", input);
  }

  async createWebRun(input: PersistWebAgentRunInput): Promise<AgentRunEntity> {
    return this.createRun("web", { ...input, sourceThreadId: null, sourceMessageId: null });
  }

  async createWebChatTurn(input: PersistWebChatTurnInput): Promise<PersistedWebChatTurn | null> {
    const dataSource = await this.getInitializedDataSource();
    return dataSource.transaction(async (entityManager): Promise<PersistedWebChatTurn | null> => {
      const now = new Date();
      const chatRepository = entityManager.getRepository(AgentChatEntity);
      const chat =
        input.chatId === null
          ? await chatRepository.save(
              chatRepository.create({
                id: randomUUID(),
                workspaceId: input.workspaceId,
                userId: input.userId,
                title: input.chatTitle,
                createdAt: now,
                updatedAt: now,
              }),
            )
          : await chatRepository.findOneBy({
              id: input.chatId,
              workspaceId: input.workspaceId,
              userId: input.userId,
            });
      if (chat === null) return null;

      const run = await this.saveRun(entityManager, "web", {
        ...input,
        sourceThreadId: chat.id,
        sourceMessageId: null,
      });
      const messageRepository = entityManager.getRepository(AgentChatMessageEntity);
      await messageRepository.save([
        messageRepository.create({
          id: randomUUID(),
          chatId: chat.id,
          agentRunId: run.id,
          role: "user",
          content: input.inputText,
          createdAt: now,
        }),
        messageRepository.create({
          id: randomUUID(),
          chatId: chat.id,
          agentRunId: run.id,
          role: "assistant",
          content: input.assistantMessage,
          createdAt: new Date(now.getTime() + 1),
        }),
      ]);
      chat.updatedAt = new Date(now.getTime() + 1);
      await chatRepository.save(chat);
      return { chat, run };
    });
  }

  private async createRun(
    source: "telegram" | "web",
    input: PersistTelegramAgentRunInput,
  ): Promise<AgentRunEntity> {
    const dataSource = await this.getInitializedDataSource();

    return dataSource.transaction((entityManager) => this.saveRun(entityManager, source, input));
  }

  private async saveRun(
    entityManager: import("typeorm").EntityManager,
    source: "telegram" | "web",
    input: PersistTelegramAgentRunInput,
  ): Promise<AgentRunEntity> {
    const now = new Date();
    const runRepository = entityManager.getRepository(AgentRunEntity);
    const run = await runRepository.save(
      runRepository.create({
        id: randomUUID(),
        workspaceId: input.workspaceId,
        userId: input.userId,
        source,
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
        createdAt: now,
        updatedAt: now,
      }),
    );

    if (input.runtimeResult.toolCalls.length > 0) {
      const toolCallRepository = entityManager.getRepository(AgentToolCallEntity);
      const toolCalls = input.runtimeResult.toolCalls.map((toolCall) =>
        toolCallRepository.create({
          id: randomUUID(),
          agentRunId: run.id,
          toolName: toolCall.toolName,
          arguments: toolCall.arguments,
          result: toolCall.result,
          status: toolCall.status,
          error: toolCall.error,
          completedAt: toolCall.completedAt,
          createdAt: now,
        }),
      );

      await toolCallRepository.save(toolCalls);
    }

    return run;
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
