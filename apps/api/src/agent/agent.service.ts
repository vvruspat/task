import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ConfirmationRequestSummaryDto } from "../confirmations/confirmations.dto.js";
import type { ConfirmationsService } from "../confirmations/confirmations.service.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import { AgentRunIntakeResponseDto, AgentRunSummaryDto } from "./agent.dto.js";
import type { AgentRuntime } from "./agent.runtime.js";
import { agentRuntimeNotConnectedResponse } from "./agent.runtime.js";
import type { AgentRunStore } from "./agent.store.js";

const maxPendingConfirmationRequestsInIntakeResponse = 5;

@Injectable()
export class AgentService {
  constructor(
    private readonly agentRunStore: AgentRunStore,
    private readonly agentRuntime: AgentRuntime,
    private readonly confirmationsService: ConfirmationsService,
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

    if (input.sourceMessageId !== undefined && input.sourceMessageId !== null) {
      const existingRun = await this.agentRunStore.findTelegramRunBySource({
        workspaceId: context.workspaceId,
        userId: context.userId,
        sourceThreadId: input.telegramChatId,
        sourceMessageId: input.sourceMessageId,
      });

      if (existingRun !== null) {
        return this.mapAgentRunToIntakeResponse(existingRun);
      }
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
      sourceThreadId: input.telegramChatId,
      sourceMessageId: input.sourceMessageId ?? null,
      inputText: input.inputText,
      runtimeResult,
    });

    return this.mapAgentRunToIntakeResponse(run);
  }

  async listWorkspaceRuns(workspaceId: string, userId: string): Promise<AgentRunSummaryDto[]> {
    const runs = await this.agentRunStore.listForWorkspace(workspaceId, userId);

    if (runs === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return runs.map((run) => mapAgentRunToSummary(run));
  }

  private async mapAgentRunToIntakeResponse(
    run: AgentRunForIntakeResponse,
  ): Promise<AgentRunIntakeResponseDto> {
    const pendingConfirmationRequests = await this.listPendingConfirmationRequestsForRun(run);

    return new AgentRunIntakeResponseDto({
      agentRunId: run.id,
      workspaceId: run.workspaceId,
      userId: run.userId,
      source: run.source,
      sourceMessageId: run.sourceMessageId,
      status: run.status,
      responseText: run.finalResponse ?? agentRuntimeNotConnectedResponse,
      pendingConfirmationRequests: pendingConfirmationRequests.map((request) => ({
        id: request.id,
        kind: request.kind,
        preview: request.preview,
        expiresAt: request.expiresAt.toISOString(),
      })),
      createdAt: run.createdAt.toISOString(),
    });
  }

  private async listPendingConfirmationRequestsForRun(
    run: AgentRunForIntakeResponse,
  ): Promise<ConfirmationRequestSummaryDto[]> {
    if (run.status !== "waiting_confirmation") {
      return [];
    }

    const requests = await this.confirmationsService.listPendingConfirmationRequests(
      run.workspaceId,
      run.userId,
    );

    return requests
      .filter((request) => request.agentRunId === run.id)
      .slice(0, maxPendingConfirmationRequestsInIntakeResponse);
  }
}

type AgentRunForIntakeResponse = {
  id: string;
  workspaceId: string;
  userId: string;
  source: "telegram" | "web" | "mini_app";
  sourceMessageId: string | null;
  status: "running" | "waiting_confirmation" | "completed" | "failed";
  finalResponse: string | null;
  createdAt: Date;
};

function mapAgentRunToSummary(run: {
  id: string;
  workspaceId: string;
  userId: string;
  source: "telegram" | "web" | "mini_app";
  sourceMessageId: string | null;
  model: string | null;
  inputText: string;
  finalResponse: string | null;
  status: "running" | "waiting_confirmation" | "completed" | "failed";
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AgentRunSummaryDto {
  return new AgentRunSummaryDto({
    id: run.id,
    workspaceId: run.workspaceId,
    userId: run.userId,
    source: run.source,
    sourceMessageId: run.sourceMessageId,
    model: run.model,
    inputText: run.inputText,
    finalResponse: run.finalResponse,
    status: run.status,
    error: run.error,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  });
}
