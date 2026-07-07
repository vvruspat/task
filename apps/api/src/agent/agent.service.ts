import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentRunIntakeResponseDto } from "./agent.dto.js";
import type { AgentRunStore } from "./agent.store.js";

export const agentRuntimeNotConnectedResponse =
  "Request recorded. Agent execution is not connected yet.";

@Injectable()
export class AgentService {
  constructor(private readonly agentRunStore: AgentRunStore) {}

  async createTelegramRun(input: CreateTelegramAgentRunInput): Promise<AgentRunIntakeResponseDto> {
    const result = await this.agentRunStore.createTelegramRun(input);

    if (result.status === "telegram_user_unlinked") {
      throw new NotFoundException("Telegram user is not linked.");
    }

    if (result.status === "telegram_chat_unlinked") {
      throw new NotFoundException("Telegram chat is not linked.");
    }

    if (result.status === "user_not_in_chat_workspace") {
      throw new ForbiddenException("Telegram user is not a member of the chat workspace.");
    }

    return new AgentRunIntakeResponseDto({
      agentRunId: result.run.id,
      workspaceId: result.run.workspaceId,
      userId: result.run.userId,
      source: result.run.source,
      sourceMessageId: result.run.sourceMessageId,
      status: result.run.status,
      responseText: result.run.finalResponse ?? agentRuntimeNotConnectedResponse,
      createdAt: result.run.createdAt.toISOString(),
    });
  }
}
