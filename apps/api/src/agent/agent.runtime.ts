import { Injectable } from "@nestjs/common";
import type { ApiOpenRouterConfig } from "../config.js";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput } from "./agent.contracts.js";
import {
  type AgentToolOperationCall,
  type AgentToolOperationDispatcher,
  StaticAgentToolOperationDispatcher,
} from "./agent-tool-dispatcher.js";

export const agentRuntimeNotConnectedResponse =
  "Request recorded. Agent execution is not connected yet.";
export const agentRuntimeToken = Symbol("AgentRuntime");
export const openRouterChatCompletionsEndpoint = "https://openrouter.ai/api/v1/chat/completions";

export type AgentRuntimeResult = {
  model: string | null;
  normalizedIntent: Record<string, unknown> | null;
  finalResponse: string | null;
  status: AgentRunStatus;
  tokenUsage: Record<string, unknown> | null;
  cost: Record<string, unknown> | null;
  error: string | null;
  toolCalls: AgentRuntimeToolCall[];
};

export type AgentRuntimeToolCall = {
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: "pending" | "success" | "error";
  error: string | null;
  completedAt: Date | null;
};

export type TelegramAgentRuntimeContext = {
  workspaceId: string;
  userId: string;
};

export type TelegramAgentRuntimeRequest = {
  input: CreateTelegramAgentRunInput;
  context: TelegramAgentRuntimeContext;
};

export type AgentRuntime = {
  handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult>;
};

export type OpenRouterFetchInit = {
  method: "POST";
  headers: OpenRouterFetchHeaders;
  body: string;
};

export type OpenRouterFetchHeaders = {
  Authorization: string;
  "Content-Type": string;
  "HTTP-Referer"?: string;
  "X-Title": string;
};

export type OpenRouterFetchResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
};

export type OpenRouterFetch = (
  url: string,
  init: OpenRouterFetchInit,
) => Promise<OpenRouterFetchResponse>;

@Injectable()
export class StubAgentRuntime implements AgentRuntime {
  async handleTelegramRequest(_request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    return {
      model: null,
      normalizedIntent: { kind: "pending_agent_runtime" },
      finalResponse: agentRuntimeNotConnectedResponse,
      status: "completed",
      tokenUsage: null,
      cost: null,
      error: null,
      toolCalls: [],
    };
  }
}

export class OpenRouterAgentRuntime implements AgentRuntime {
  constructor(
    private readonly config: ApiOpenRouterConfig,
    private readonly fetcher: OpenRouterFetch = defaultOpenRouterFetch,
    private readonly toolDispatcher: AgentToolOperationDispatcher = new StaticAgentToolOperationDispatcher(),
  ) {}

  async handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult> {
    const models = this.getCandidateModels();
    const errors: string[] = [];
    let failedResult: AgentRuntimeResult | null = null;

    for (const model of models) {
      const result = await this.tryComplete(request, model);

      if (result.status === "completed") {
        return result;
      }

      failedResult = result;
      errors.push(`${model}: ${result.error ?? "OpenRouter runtime failed."}`);
    }

    if (errors.length === 1 && failedResult !== null) {
      return failedResult;
    }

    const lastModel = models[models.length - 1] ?? this.config.model;
    return buildFailedRuntimeResult(lastModel, errors.join(" | "));
  }

  private getCandidateModels(): string[] {
    if (this.config.fallbackModel === null || this.config.fallbackModel === this.config.model) {
      return [this.config.model];
    }

    return [this.config.model, this.config.fallbackModel];
  }

  private async tryComplete(
    request: TelegramAgentRuntimeRequest,
    model: string,
  ): Promise<AgentRuntimeResult> {
    try {
      const response = await this.fetcher(openRouterChatCompletionsEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          ...(this.config.siteUrl === null ? {} : { "HTTP-Referer": this.config.siteUrl }),
          "X-Title": this.config.appTitle,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You are tAsk's backend task agent. Reply with a short, actionable response.",
            },
            {
              role: "user",
              content: request.input.inputText,
            },
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        return buildFailedRuntimeResult(
          model,
          `OpenRouter request failed with status ${response.status}: ${await readOpenRouterError(response)}`,
        );
      }

      const body = await response.json();
      const message = readOpenRouterAssistantMessage(body);

      if (message === null) {
        return buildFailedRuntimeResult(
          model,
          "OpenRouter response did not include an assistant message.",
        );
      }

      const content = readOpenRouterAssistantContent(message);
      const parsedToolCalls = readOpenRouterToolCalls(message);

      if (parsedToolCalls.status === "error") {
        return buildFailedRuntimeResult(model, parsedToolCalls.error);
      }

      if (content === null && parsedToolCalls.toolCalls.length === 0) {
        return buildFailedRuntimeResult(
          model,
          "OpenRouter response did not include assistant content or tool calls.",
        );
      }

      const toolCalls = await this.dispatchToolCalls(parsedToolCalls.toolCalls);
      const failedToolCall = toolCalls.find((toolCall) => toolCall.status === "error") ?? null;

      return {
        model,
        normalizedIntent: {
          kind: "openrouter_chat_completion",
          source: "telegram",
        },
        finalResponse: content ?? "Agent operation dispatch recorded.",
        status: failedToolCall === null ? "completed" : "failed",
        tokenUsage: readOpenRouterUsage(body),
        cost: null,
        error: failedToolCall?.error ?? null,
        toolCalls,
      };
    } catch (error: unknown) {
      return buildFailedRuntimeResult(model, readRuntimeErrorMessage(error));
    }
  }

  private async dispatchToolCalls(
    toolCalls: AgentToolOperationCall[],
  ): Promise<AgentRuntimeToolCall[]> {
    const dispatchedToolCalls: AgentRuntimeToolCall[] = [];

    for (const toolCall of toolCalls) {
      dispatchedToolCalls.push(await this.dispatchToolCall(toolCall));
    }

    return dispatchedToolCalls;
  }

  private async dispatchToolCall(toolCall: AgentToolOperationCall): Promise<AgentRuntimeToolCall> {
    try {
      return await this.toolDispatcher.dispatchToolCall(toolCall);
    } catch (error: unknown) {
      return {
        toolName: toolCall.toolName,
        arguments: toolCall.arguments,
        result: null,
        status: "error",
        error: readRuntimeErrorMessage(error),
        completedAt: new Date(),
      };
    }
  }
}

async function defaultOpenRouterFetch(
  url: string,
  init: OpenRouterFetchInit,
): Promise<OpenRouterFetchResponse> {
  return fetch(url, init);
}

function buildFailedRuntimeResult(model: string, error: string): AgentRuntimeResult {
  return {
    model,
    normalizedIntent: {
      kind: "openrouter_chat_completion",
      source: "telegram",
    },
    finalResponse: "Agent execution failed before producing a response.",
    status: "failed",
    tokenUsage: null,
    cost: null,
    error,
    toolCalls: [],
  };
}

function readOpenRouterAssistantMessage(value: unknown): OpenRouterMessage | null {
  if (!isRecord(value)) {
    return null;
  }

  if (!isOpenRouterCompletionResponse(value)) {
    return null;
  }

  const choices = value.choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const [firstChoice] = choices;

  if (!isOpenRouterChoice(firstChoice) || !isOpenRouterMessage(firstChoice.message)) {
    return null;
  }

  return firstChoice.message;
}

function readOpenRouterAssistantContent(message: OpenRouterMessage): string | null {
  const content = message.content;

  return typeof content === "string" && content.trim().length > 0 ? content : null;
}

function readOpenRouterToolCalls(message: OpenRouterMessage): ReadOpenRouterToolCallsResult {
  const toolCalls = message.tool_calls;

  if (toolCalls === undefined) {
    return { status: "success", toolCalls: [] };
  }

  if (!Array.isArray(toolCalls)) {
    return {
      status: "error",
      error: "OpenRouter assistant tool_calls must be an array.",
    };
  }

  const parsedToolCalls: AgentToolOperationCall[] = [];

  for (const toolCall of toolCalls) {
    const parsedToolCall = readOpenRouterToolCall(toolCall);

    if (parsedToolCall.status === "error") {
      return parsedToolCall;
    }

    parsedToolCalls.push(parsedToolCall.toolCall);
  }

  return { status: "success", toolCalls: parsedToolCalls };
}

function readOpenRouterToolCall(value: unknown): ReadOpenRouterToolCallResult {
  if (!isOpenRouterToolCall(value) || !isOpenRouterFunctionToolCall(value.function)) {
    return {
      status: "error",
      error: "OpenRouter assistant tool call must include a function name and arguments.",
    };
  }

  const toolName = value.function.name;

  if (typeof toolName !== "string" || toolName.trim().length === 0) {
    return {
      status: "error",
      error: "OpenRouter assistant tool call function name must be a non-empty string.",
    };
  }

  const argumentsJson = value.function.arguments;

  if (typeof argumentsJson !== "string") {
    return {
      status: "error",
      error: "OpenRouter assistant tool call function arguments must be a JSON object string.",
    };
  }

  const parsedArguments = parseToolCallArguments(argumentsJson);

  if (parsedArguments.status === "error") {
    return parsedArguments;
  }

  return {
    status: "success",
    toolCall: {
      toolName,
      arguments: parsedArguments.arguments,
    },
  };
}

function parseToolCallArguments(value: string): ParseToolCallArgumentsResult {
  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!isRecord(parsedValue)) {
      return {
        status: "error",
        error: "OpenRouter assistant tool call function arguments must parse to an object.",
      };
    }

    return {
      status: "success",
      arguments: parsedValue,
    };
  } catch {
    return {
      status: "error",
      error: "OpenRouter assistant tool call function arguments must be valid JSON.",
    };
  }
}

function readOpenRouterUsage(value: unknown): Record<string, unknown> | null {
  if (!isOpenRouterCompletionResponse(value) || !isRecord(value.usage)) {
    return null;
  }

  return value.usage;
}

async function readOpenRouterError(response: OpenRouterFetchResponse): Promise<string> {
  try {
    const body = await response.json();
    const message = readOpenRouterErrorMessage(body);

    if (message !== null) {
      return message;
    }
  } catch {
    return response.text();
  }

  return response.text();
}

function readOpenRouterErrorMessage(value: unknown): string | null {
  if (!isOpenRouterErrorResponse(value) || !isOpenRouterError(value.error)) {
    return null;
  }

  const message = value.error.message;

  return typeof message === "string" && message.trim().length > 0 ? message : null;
}

function readRuntimeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "OpenRouter runtime failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type OpenRouterCompletionResponse = {
  choices?: unknown;
  usage?: unknown;
};

type OpenRouterChoice = {
  message?: unknown;
};

type OpenRouterMessage = {
  content?: unknown;
  tool_calls?: unknown;
};

type OpenRouterErrorResponse = {
  error?: unknown;
};

type OpenRouterError = {
  message?: unknown;
};

type OpenRouterToolCall = {
  function?: unknown;
};

type OpenRouterFunctionToolCall = {
  name?: unknown;
  arguments?: unknown;
};

type ReadOpenRouterToolCallsResult =
  | {
      status: "success";
      toolCalls: AgentToolOperationCall[];
    }
  | {
      status: "error";
      error: string;
    };

type ReadOpenRouterToolCallResult =
  | {
      status: "success";
      toolCall: AgentToolOperationCall;
    }
  | {
      status: "error";
      error: string;
    };

type ParseToolCallArgumentsResult =
  | {
      status: "success";
      arguments: Record<string, unknown>;
    }
  | {
      status: "error";
      error: string;
    };

function isOpenRouterCompletionResponse(value: unknown): value is OpenRouterCompletionResponse {
  return isRecord(value);
}

function isOpenRouterChoice(value: unknown): value is OpenRouterChoice {
  return isRecord(value);
}

function isOpenRouterMessage(value: unknown): value is OpenRouterMessage {
  return isRecord(value);
}

function isOpenRouterErrorResponse(value: unknown): value is OpenRouterErrorResponse {
  return isRecord(value);
}

function isOpenRouterError(value: unknown): value is OpenRouterError {
  return isRecord(value);
}

function isOpenRouterToolCall(value: unknown): value is OpenRouterToolCall {
  return isRecord(value);
}

function isOpenRouterFunctionToolCall(value: unknown): value is OpenRouterFunctionToolCall {
  return isRecord(value);
}
