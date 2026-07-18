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

const openRouterAgentTools = [
  {
    type: "function",
    function: {
      name: "project_create",
      description: "Create a real project in the current workspace.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_create",
      description: "Create a real task in a project. Use the selected project id when provided.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
        },
        required: ["projectId", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_add_subtasks",
      description: "Create multiple real subtasks under an existing parent task.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          subtasks: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string", minLength: 1 },
                description: { type: ["string", "null"] },
              },
              required: ["title"],
            },
          },
        },
        required: ["projectId", "taskId", "subtasks"],
      },
    },
  },
] as const;

const agentSystemPrompt = [
  "You are tAsk's backend task agent.",
  "Use the provided tools for every project or task mutation.",
  "Never claim that a project or task was created unless the corresponding tool succeeded in this response.",
  "The workspace and current user are supplied by the server and must not be invented.",
  "When the user message includes a selected project id, pass that exact id to task_create.",
  "Continue calling tools until every requested project, task, and subtask has been created.",
  "After task_create returns an id, use that id with task_add_subtasks when subtasks were requested.",
  "Reply briefly and accurately.",
].join(" ");

const maxOpenRouterToolRounds = 8;

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

      if (result.status === "completed" || result.toolCalls.length > 0) {
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
      const messages: OpenRouterConversationMessage[] = [
        { role: "system", content: agentSystemPrompt },
        { role: "user", content: request.input.inputText },
      ];
      const allToolCalls: AgentRuntimeToolCall[] = [];
      let tokenUsage: Record<string, unknown> | null = null;

      for (let round = 0; round < maxOpenRouterToolRounds; round += 1) {
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
            messages,
            tools: openRouterAgentTools,
            tool_choice: "auto",
            stream: false,
          }),
        });

        if (!response.ok) {
          return buildRuntimeFailure(
            model,
            `OpenRouter request failed with status ${response.status}: ${await readOpenRouterError(response)}`,
            allToolCalls,
          );
        }

        const body = await response.json();
        tokenUsage = readOpenRouterUsage(body) ?? tokenUsage;
        const message = readOpenRouterAssistantMessage(body);

        if (message === null) {
          return buildRuntimeFailure(
            model,
            "OpenRouter response did not include an assistant message.",
            allToolCalls,
          );
        }

        const content = readOpenRouterAssistantContent(message);
        const parsedToolCalls = readOpenRouterToolCalls(message);

        if (parsedToolCalls.status === "error") {
          return buildRuntimeFailure(model, parsedToolCalls.error, allToolCalls);
        }

        if (parsedToolCalls.toolCalls.length === 0) {
          if (allToolCalls.length === 0 && looksLikeMutationRequest(request.input.inputText)) {
            return {
              model,
              normalizedIntent: { kind: "openrouter_chat_completion", source: "telegram" },
              finalResponse:
                "No project or task was created because the agent did not call a tool.",
              status: "failed",
              tokenUsage,
              cost: null,
              error: "Agent did not call the required mutation tool.",
              toolCalls: [],
            };
          }

          if (content === null && allToolCalls.length === 0) {
            return buildRuntimeFailure(
              model,
              "OpenRouter response did not include assistant content or tool calls.",
              allToolCalls,
            );
          }

          return {
            model,
            normalizedIntent: { kind: "openrouter_chat_completion", source: "telegram" },
            finalResponse:
              formatSuccessfulToolResponse(allToolCalls) ??
              content ??
              "No operation was performed.",
            status: "completed",
            tokenUsage,
            cost: null,
            error: null,
            toolCalls: allToolCalls,
          };
        }

        const dispatchedToolCalls = await this.dispatchToolCalls(
          parsedToolCalls.toolCalls,
          request.context,
        );
        allToolCalls.push(...dispatchedToolCalls);
        const failedToolCall =
          dispatchedToolCalls.find((toolCall) => toolCall.status === "error") ?? null;

        if (failedToolCall !== null) {
          return {
            model,
            normalizedIntent: { kind: "openrouter_chat_completion", source: "telegram" },
            finalResponse: `Operation failed: ${failedToolCall.error ?? "unknown tool error"}`,
            status: "failed",
            tokenUsage,
            cost: null,
            error: failedToolCall.error,
            toolCalls: allToolCalls,
          };
        }

        messages.push({
          role: "assistant",
          content,
          tool_calls: parsedToolCalls.toolCalls.map(toOpenRouterConversationToolCall),
        });
        for (let index = 0; index < parsedToolCalls.toolCalls.length; index += 1) {
          const requestedToolCall = parsedToolCalls.toolCalls[index];
          const dispatchedToolCall = dispatchedToolCalls[index];
          if (requestedToolCall === undefined || dispatchedToolCall === undefined) {
            continue;
          }

          messages.push({
            role: "tool",
            tool_call_id: requestedToolCall.callId,
            content: JSON.stringify({
              error: dispatchedToolCall.error,
              result: dispatchedToolCall.result,
              status: dispatchedToolCall.status,
            }),
          });
        }
      }

      return buildRuntimeFailure(
        model,
        `Agent exceeded ${maxOpenRouterToolRounds} tool rounds.`,
        allToolCalls,
      );
    } catch (error: unknown) {
      return buildFailedRuntimeResult(model, readRuntimeErrorMessage(error));
    }
  }

  private async dispatchToolCalls(
    toolCalls: AgentToolOperationCall[],
    context: TelegramAgentRuntimeContext,
  ): Promise<AgentRuntimeToolCall[]> {
    const dispatchedToolCalls: AgentRuntimeToolCall[] = [];

    for (const toolCall of toolCalls) {
      dispatchedToolCalls.push(await this.dispatchToolCall(toolCall, context));
    }

    return dispatchedToolCalls;
  }

  private async dispatchToolCall(
    toolCall: AgentToolOperationCall,
    context: TelegramAgentRuntimeContext,
  ): Promise<AgentRuntimeToolCall> {
    try {
      return await this.toolDispatcher.dispatchToolCall(toolCall, context);
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

function formatSuccessfulToolResponse(toolCalls: AgentRuntimeToolCall[]): string | null {
  const successful = toolCalls.filter((toolCall) => toolCall.status === "success");

  if (successful.length === 0) {
    return null;
  }

  const projectCalls = successful.filter((toolCall) => toolCall.toolName.includes("project"));
  const taskCreateCalls = successful.filter(
    (toolCall) => toolCall.toolName.includes("task") && !toolCall.toolName.includes("subtask"),
  );
  const subtaskCalls = successful.filter((toolCall) => toolCall.toolName.includes("subtask"));
  const parts = projectCalls.map((toolCall) => {
    const id =
      readResultString(toolCall.result, "id") ??
      readResultString(toolCall.result, "taskId") ??
      readResultString(toolCall.result, "projectId");
    const title = readResultString(toolCall.result, "title");
    const titlePart = title === null ? "" : ` "${title}"`;
    const idPart = id === null ? "" : ` (ID: ${id})`;
    return `Project${titlePart} created${idPart}.`;
  });

  if (taskCreateCalls.length === 1) {
    const taskCall = taskCreateCalls[0];
    if (taskCall !== undefined) {
      const id =
        readResultString(taskCall.result, "id") ?? readResultString(taskCall.result, "taskId");
      const title = readResultString(taskCall.result, "title");
      parts.push(
        `Task${title === null ? "" : ` "${title}"`} created${id === null ? "" : ` (ID: ${id})`}.`,
      );
    }
  } else if (taskCreateCalls.length > 1) {
    const titles = taskCreateCalls.flatMap((toolCall) => {
      const title = readResultString(toolCall.result, "title");
      return title === null ? [] : [title];
    });
    parts.push(
      `${taskCreateCalls.length} tasks created${titles.length === 0 ? "" : `: ${titles.join(", ")}`}.`,
    );
  }

  const createdSubtaskCount = subtaskCalls.reduce(
    (total, toolCall) => total + (readResultNumber(toolCall.result, "createdCount") ?? 0),
    0,
  );
  if (subtaskCalls.length > 0) {
    parts.push(
      `${createdSubtaskCount} subtasks created across ${subtaskCalls.length} parent tasks.`,
    );
  }

  return parts.join(" ");
}

function readResultString(result: Record<string, unknown> | null, key: string): string | null {
  if (result === null) {
    return null;
  }

  const value = result[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readResultNumber(result: Record<string, unknown> | null, key: string): number | null {
  if (result === null) {
    return null;
  }

  const value = result[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toOpenRouterConversationToolCall(
  toolCall: AgentToolOperationCall,
): OpenRouterConversationToolCall {
  return {
    id: toolCall.callId,
    type: "function",
    function: {
      name: toolCall.toolName,
      arguments: JSON.stringify(toolCall.arguments),
    },
  };
}

function looksLikeMutationRequest(inputText: string): boolean {
  return /(создай|создать|создайте|добавь|добавить|добавьте|create|add|archive|delete|update)/iu.test(
    inputText,
  );
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

function buildRuntimeFailure(
  model: string,
  error: string,
  toolCalls: AgentRuntimeToolCall[],
): AgentRuntimeResult {
  return {
    ...buildFailedRuntimeResult(model, error),
    toolCalls,
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
  const callId = value.id;

  if (typeof callId !== "string" || callId.trim().length === 0) {
    return {
      status: "error",
      error: "OpenRouter assistant tool call must include a non-empty id.",
    };
  }

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
      callId,
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

type OpenRouterConversationToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type OpenRouterConversationMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls: OpenRouterConversationToolCall[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

type OpenRouterErrorResponse = {
  error?: unknown;
};

type OpenRouterError = {
  message?: unknown;
};

type OpenRouterToolCall = {
  id?: unknown;
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
