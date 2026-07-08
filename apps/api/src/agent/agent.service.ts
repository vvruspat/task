import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentRunIntakeResponseDto } from "./agent.dto.js";
import type { AgentRuntime } from "./agent.runtime.js";
import { agentRuntimeNotConnectedResponse } from "./agent.runtime.js";
import type { AgentRunStore } from "./agent.store.js";

@Injectable()
export class AgentService {
  constructor(
    private readonly agentRunStore: AgentRunStore,
    private readonly agentRuntime: AgentRuntime,
  ) {}

  async createTelegramRun(input: CreateTelegramAgentRunInput): Promise<AgentRunIntakeResponseDto> {
    const context = await this.agentRunStore.resolveTelegramRunContext(input);

    if (context.status === "telegram_user_unlinked") {
      throw new NotFoundException("Telegram user is not linked.");
    }

    if (context.status === "telegram_chat_unlinked") {
      throw new NotFoundException("Telegram chat is not linked.");
    }

    if (context.status === "user_not_in_chat_workspace") {
      throw new ForbiddenException("Telegram user is not a member of the chat workspace.");
    }

    const runtimeResult = await this.agentRuntime.handleTelegramRequest({
      input,
      context: {
        workspaceId: context.workspaceId,
        userId: context.userId,
      },
    });
    const run = await this.agentRunStore.createTelegramRun({
      workspaceId: context.workspaceId,
      userId: context.userId,
      sourceMessageId: input.sourceMessageId ?? null,
      inputText: input.inputText,
      runtimeResult,
    });

    return new AgentRunIntakeResponseDto({
      agentRunId: run.id,
      workspaceId: run.workspaceId,
      userId: run.userId,
      source: run.source,
      sourceMessageId: run.sourceMessageId,
      status: run.status,
      responseText: run.finalResponse ?? agentRuntimeNotConnectedResponse,
      createdAt: run.createdAt.toISOString(),
    });
  }
}
