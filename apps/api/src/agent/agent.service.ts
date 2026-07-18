import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { ConfirmationRequestSummaryDto } from "../confirmations/confirmations.dto.js";
import type { ConfirmationsService } from "../confirmations/confirmations.service.js";
import type {
  AgentRunDetail,
  CreateTelegramAgentRunInput,
  CreateWebAgentChatInput,
} from "./agent.contracts.js";
import { AgentRunDetailDto, AgentRunIntakeResponseDto, AgentRunSummaryDto } from "./agent.dto.js";
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

  async createWebRun(
    workspaceId: string,
    userId: string,
    input: CreateWebAgentChatInput,
  ): Promise<AgentRunIntakeResponseDto> {
    if (!(await this.agentRunStore.isWorkspaceMember(workspaceId, userId))) {
      throw new NotFoundException("Workspace was not found.");
    }

    const lastUserMessage = input.messages.at(-1);
    if (lastUserMessage === undefined) {
      throw new NotFoundException("Agent message was not found.");
    }

    const runtimeInput = formatWebConversation(input);
    const runtimeResult = await this.agentRuntime.handleTelegramRequest({
      input: {
        telegramId: "web",
        telegramChatId: "web",
        inputText: runtimeInput,
        attachments: [],
      },
      context: { workspaceId, userId },
    });
    const webRuntimeResult = {
      ...runtimeResult,
      normalizedIntent: {
        ...(runtimeResult.normalizedIntent ?? {}),
        source: "web",
      },
    };
    const run = await this.agentRunStore.createWebRun({
      workspaceId,
      userId,
      inputText: lastUserMessage.content,
      runtimeResult: webRuntimeResult,
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

  async getWorkspaceRun(
    workspaceId: string,
    agentRunId: string,
    userId: string,
  ): Promise<AgentRunDetailDto> {
    const detail = await this.agentRunStore.getDetailForWorkspace(workspaceId, agentRunId, userId);

    if (detail === null) {
      throw new NotFoundException("Agent run was not found.");
    }

    return new AgentRunDetailDto({
      ...mapAgentRunToAuditDetailValue(detail.run),
      toolCalls: detail.toolCalls.map((toolCall) => ({
        id: toolCall.id,
        toolName: redactAuditString(toolCall.toolName),
        arguments: redactSensitivePayload(toolCall.arguments),
        result: toolCall.result === null ? null : redactSensitivePayload(toolCall.result),
        status: toolCall.status,
        error: toolCall.error === null ? null : redactAuditString(toolCall.error),
        createdAt: toolCall.createdAt.toISOString(),
        completedAt: toolCall.completedAt?.toISOString() ?? null,
      })),
      confirmationRequests: detail.confirmationRequests.map((request) => ({
        id: request.id,
        kind: redactAuditString(request.kind),
        preview: redactSensitivePayload(request.preview),
        status: request.status,
        expiresAt: request.expiresAt.toISOString(),
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      })),
    });
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

function formatWebConversation(input: CreateWebAgentChatInput): string {
  const projectContext =
    input.projectId === null || input.projectId === undefined
      ? "No project is selected."
      : `Selected project id: ${input.projectId}.`;
  const conversation = input.messages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
  return `${projectContext}\n\n${conversation}`;
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
  return new AgentRunSummaryDto(mapAgentRunToAuditDetailValue(run));
}

function mapAgentRunToSummaryValue(run: {
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
}): Omit<AgentRunDetail, "toolCalls" | "confirmationRequests"> {
  return {
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
  };
}

function mapAgentRunToAuditDetailValue(run: {
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
}): Omit<AgentRunDetail, "toolCalls" | "confirmationRequests"> {
  const summary = mapAgentRunToSummaryValue(run);

  return {
    ...summary,
    inputText: redactAuditString(summary.inputText),
    finalResponse: summary.finalResponse === null ? null : redactAuditString(summary.finalResponse),
    error: summary.error === null ? null : redactAuditString(summary.error),
  };
}

const sensitivePayloadKeyPattern =
  /(?:api|access|client|private|refresh|session)[_-]?(?:key|token|secret)|assertion|authorization|code|cookie|credential|pass(?:word|phrase)?|secret|(?:^|[_-])sig(?:nature)?(?:$|[_-])|token|x-amz-signature/iu;
const redactedPayloadValue = "[REDACTED]";
const sensitiveAssignmentPattern =
  /\b((?:api|access|client|private|refresh|session)[_-]?(?:key|token|secret)|assertion|authorization|code|cookie|credential|pass(?:word|phrase)?|secret|sig(?:nature)?|token|x-amz-signature)\s*[=:]\s*[^\s,;&]+/giu;
const bearerCredentialPattern = /\b(Bearer)\s+[^\s,;]+/giu;
const privateKeyBlockPattern =
  /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/gu;

function redactAuditString(value: string): string {
  const redactedAssignments = value
    .replace(privateKeyBlockPattern, redactedPayloadValue)
    .replace(bearerCredentialPattern, "$1 [REDACTED]")
    .replace(sensitiveAssignmentPattern, "$1=[REDACTED]");

  return redactedAssignments.replaceAll(/https?:\/\/[^\s,]+/gu, redactCredentialUrl);
}

function redactCredentialUrl(value: string): string {
  try {
    const url = new URL(value);

    for (const [key] of url.searchParams) {
      if (sensitivePayloadKeyPattern.test(key)) {
        url.searchParams.set(key, redactedPayloadValue);
      }
    }

    if (url.username.length > 0) {
      url.username = redactedPayloadValue;
    }

    if (url.password.length > 0) {
      url.password = redactedPayloadValue;
    }

    return url.toString();
  } catch {
    return value;
  }
}

function redactSensitivePayload(value: Record<string, unknown>): Record<string, unknown> {
  return redactPayloadRecord(value);
}

function redactPayloadRecord(value: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    redacted[key] = sensitivePayloadKeyPattern.test(key)
      ? redactedPayloadValue
      : redactPayloadValue(nestedValue);
  }

  return redacted;
}

function redactPayloadValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactAuditString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactPayloadValue(item));
  }

  if (isUnknownRecord(value)) {
    return redactPayloadRecord(value);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
