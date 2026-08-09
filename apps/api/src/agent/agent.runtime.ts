import { Injectable } from "@nestjs/common";
import type {
  IntegrationAgentToolDefinition,
  IntegrationAgentToolInputSchema,
} from "@task/integration-sdk";
import type { ApiOpenRouterConfig } from "../config.js";
import type { AgentRunStatus } from "../persistence/types/core-persistence.types.js";
import type { CreateTelegramAgentRunInput, WebAgentChatMessage } from "./agent.contracts.js";
import {
  type AgentToolOperationCall,
  type AgentToolOperationDispatcher,
  StaticAgentToolOperationDispatcher,
} from "./agent-tool-dispatcher.js";
import { containsVisibleInternalIdentifier } from "./user-facing-agent-response.js";

export const agentRuntimeNotConnectedResponse =
  "Request recorded. Agent execution is not connected yet.";
export const agentRuntimeToken = Symbol("AgentRuntime");
export const openRouterChatCompletionsEndpoint = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterAgentToolDefinition = {
  function: {
    description: string;
    name: string;
    parameters: IntegrationAgentToolInputSchema;
  };
  type: "function";
};

const openRouterAgentTools = [
  {
    type: "function",
    function: {
      name: "project_list",
      description:
        "List the real active projects visible to the current user in the current workspace. Use this instead of guessing project names or ids.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "project_get",
      description:
        "Get one real project visible to the current user by its id. Use project_list first when the user supplied only a project name.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
        },
        required: ["projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "member_list",
      description:
        "List every member of the current workspace with the internal userId plus human-readable display name, email, and Telegram username. Use this before filtering or reporting tasks for a named person: choose the matching member from human-readable fields, then compare its userId with task assigneeUserId. Internal ids must never be shown to the user.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_list",
      description:
        "List active tasks in a real project visible to the current user, optionally filtered by an internal assigneeUserId. For a named person, call member_list first, select the matching member by display name, email, or Telegram username, then pass that member's exact userId as assigneeUserId so the backend returns only their tasks. Never show internal ids to the user. Omit projectId only when the server supplied a selected project.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          assigneeUserId: {
            type: "string",
            format: "uuid",
            description:
              "Exact internal userId selected from member_list. Required when the user asks for tasks assigned to a named person.",
          },
          projectId: { type: "string", format: "uuid" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "status_list",
      description:
        "List the exact statuses configured for a real project, including the id used by tasks and its human-readable name. Use this to map task statusId values before reporting task statuses.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "telegram_history_read",
      description:
        "Read recent text messages saved from the current Telegram chat and topic. Use this when the user's request depends on what people said earlier, references missing conversational context, or asks for a summary of the chat. If access is disabled, clearly tell the user to enable 'Доступ к истории переписки' in this chat's tAsk settings; only messages received after enabling can be read.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          limit: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            description: "Maximum number of recent messages to return. Defaults to 30.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_skill_create",
      description:
        "Create a reusable task template in the current workspace. Each subtask describes a step that will be created whenever the template is applied to a root task.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
          aliases: {
            type: "array",
            maxItems: 50,
            items: { type: "string", minLength: 1 },
          },
          subtasks: {
            type: "array",
            minItems: 1,
            maxItems: 50,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string", minLength: 1 },
                description: { type: ["string", "null"] },
                labels: {
                  type: "array",
                  maxItems: 50,
                  items: { type: "string", minLength: 1 },
                },
              },
              required: ["title"],
            },
          },
        },
        required: ["name", "subtasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "project_create",
      description:
        "Create a real project in the current workspace. When the user asks for a project with a named list of peer tasks (for example 8 songs), include every item in tasks so each becomes an independent root task. Never create a container task named after the project.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
          taskTypeHint: {
            type: "string",
            minLength: 1,
            description:
              "The shared type of every listed task, for example 'песня'. Used to resolve a task template independently for each task.",
          },
          taskSkillId: { type: "string", format: "uuid" },
          tasks: {
            type: "array",
            minItems: 0,
            maxItems: 100,
            description:
              "Every independent root task requested inside the new project. Use an empty array only when the user requested no tasks.",
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
        required: ["title", "tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_create",
      description:
        "Create a real task in a project. The backend automatically checks matching task templates: it creates a plain task without subtasks when none match, applies the only match, and returns candidates without creating anything when several match. If the user is choosing from candidates previously offered by the agent, pass the chosen taskSkillId.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
          taskSkillId: { type: "string", format: "uuid" },
        },
        required: ["projectId", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_add_subtasks",
      description:
        "Create component steps under one existing parent task. Use only when the user explicitly describes subtasks or steps of that one task. Never use this for peer items in a project, such as a list of songs, issues, or deliverables.",
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
  {
    type: "function",
    function: {
      name: "task_lookup",
      description:
        "Resolve a task reference to the real projectId and taskId required by mutation tools. The reference may be a task URL, UUID, issue identifier such as ZNA-26, or task title. If candidates are returned, use their context to choose one and call task_lookup again with its taskId. If no task is found, ask the user for a more precise reference.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          reference: { type: "string", minLength: 1 },
        },
        required: ["reference"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_update",
      description:
        "Update the title and/or Markdown description of an existing task. Pass only fields the user explicitly asked to change.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
        },
        required: ["projectId", "taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_set_status",
      description:
        "Set a task status by its human-readable project status name. Pass null to remove the status. The backend resolves the name only among statuses of the selected project.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          statusName: { type: ["string", "null"] },
        },
        required: ["projectId", "taskId", "statusName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_set_assignee",
      description:
        "Assign a task to a workspace member by human-readable name, email, or Telegram username. Pass null to unassign. The backend resolves the member inside the current workspace and refuses ambiguous matches.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          assignee: { type: ["string", "null"] },
        },
        required: ["projectId", "taskId", "assignee"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_set_due_date",
      description:
        "Set a task due date as an ISO 8601 timestamp. Pass null to remove the due date.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          dueAt: { type: ["string", "null"], format: "date-time" },
        },
        required: ["projectId", "taskId", "dueAt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "task_add_link_attachment",
      description:
        "Attach an HTTP or HTTPS link to an existing task. This tool attaches links; binary files must already be uploaded through the product UI or another upload-capable integration.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          projectId: { type: "string", format: "uuid" },
          taskId: { type: "string", format: "uuid" },
          url: { type: "string", format: "uri" },
          title: { type: ["string", "null"] },
        },
        required: ["projectId", "taskId", "url"],
      },
    },
  },
] as const satisfies readonly OpenRouterAgentToolDefinition[];

const coreMutationToolNames = new Set([
  "project_create",
  "task_add_link_attachment",
  "task_add_subtasks",
  "task_create",
  "task_set_assignee",
  "task_set_due_date",
  "task_set_status",
  "task_skill_create",
  "task_update",
]);

const agentSystemPrompt = [
  "You are tAsk's backend task agent.",
  "Use the provided tools for every project or task mutation.",
  "Use project_list, project_get, member_list, task_list, task_lookup, and status_list for workspace reads. Never invent projects, tasks, ids, statuses, or assignees.",
  "Internal ids and UUIDs are only for tool calls. Never expose a UUID, user id, project id, task id, status id, template id, workspace id, or other internal identifier in a user-facing reply. Refer to people, projects, tasks, statuses, and templates only by human-readable names, emails, Telegram usernames, or issue identifiers. Internal identifiers may appear only inside non-visible Markdown link destinations.",
  "Never claim that a project, task, or task template was created unless the corresponding tool succeeded in this response.",
  "The workspace and current user are supplied by the server and must not be invented.",
  "When the user names a project and no selected project id is supplied by the server, call project_list first and use the exact returned id. Never invent a project id from its name.",
  "When the user message includes a selected project id, pass that exact id to task_create.",
  "When a selected project id is supplied by the server, task_list may omit projectId.",
  "Before reporting task statuses, call status_list for the same project and map every task statusId to the exact returned status name. Never invent placeholder labels such as Status A or Status B.",
  "When the user asks to create a project with a named list or count of peer items (for example, a project with 8 songs), call project_create once with those items in its tasks array and set taskTypeHint to the singular item type. Every listed item is an independent root task, not a subtask.",
  "When the user asks to create a new task template, call task_skill_create and choose practical reusable subtasks from the user's goal when they did not specify them.",
  "When the user asks for a new template and project items based on it in the same request, call task_skill_create first, then pass the exact returned template id as taskSkillId to project_create so every root task receives the new template.",
  "A successful project_create call with tasks already created the complete list, including any template-generated subtasks. Do not call task_create or task_add_subtasks for those items afterward.",
  "Never create a task whose title duplicates the new project title unless the user explicitly requests that separate task.",
  "Never pass peer project items such as songs, issues, tracks, or deliverables to task_add_subtasks. task_add_subtasks is only for explicitly requested component steps under one parent task.",
  "For every root task request call task_create exactly once; the backend checks matching task templates before creating anything.",
  "If task_create reports task_skill_selection_required, ask the user to choose one candidate and do not claim that a task was created.",
  "When the conversation contains a user choice from task skill candidates, call task_create with the chosen candidate taskSkillId.",
  "When task_create finds no matching template, accept the plain task it creates. Do not invent subtasks, create a new template, or call task_add_subtasks unless the user explicitly supplied those component steps.",
  "Continue calling tools until every requested project, task, and subtask has been created.",
  "After task_create returns an id, use that id with task_add_subtasks when subtasks were requested.",
  "For changes to an existing task, use task_update, task_set_status, task_set_assignee, task_set_due_date, or task_add_link_attachment as appropriate. Never claim that a task property changed unless the corresponding tool succeeded.",
  "When an existing task is referenced by a URL, UUID, issue identifier such as ZNA-26, or title, call task_lookup first with that reference, then use the returned projectId and taskId in the requested mutation tool. If task_lookup returns task_candidates, choose only when the candidates and user context make the intended task clear, call task_lookup again with the chosen taskId, and otherwise ask the user to clarify. Never invent UUIDs.",
  "Before answering which tasks belong to a named person, call member_list. Inspect every member's displayName, email, and telegramUsername, choose the best human-readable match, then pass that member's exact userId to task_list as assigneeUserId so the backend returns only their tasks. Never show that id, a shortened form of it, or ask the user to identify an id. Resolve assignees for mutations by passing the user's human-readable name, email, or Telegram username to task_set_assignee; never invent a user id.",
  "Resolve statuses by passing the user's human-readable status name to task_set_status; never invent a status id.",
  "Connected workspace integrations may add namespaced tools. Use their read-only search/get tools when the user asks about external resources.",
  "In Telegram, when the request depends on earlier chat messages that are not present in the current request, call telegram_history_read. Never pretend to know the chat history without this tool. If it reports history_access_disabled, tell the user to open this Telegram chat's settings in tAsk and enable 'Доступ к истории переписки'; explain that only new messages received after enabling will be saved.",
  "Reply briefly and accurately.",
].join(" ");

function formatAgentSystemPrompt(projectId: string | null | undefined): string {
  return projectId === null || projectId === undefined
    ? `${agentSystemPrompt} No project is selected in the current conversation.`
    : `${agentSystemPrompt} The selected project id is ${projectId}.`;
}

const chatTitleSystemPrompt =
  "Create a concise title for this chat in the user's language. Return only the title, 2 to 7 words, without quotes, punctuation at the end, or commentary.";

// One model round can contain only one tool call for some providers. Keep enough
// room for operational batches (for example, one project plus many tasks) and
// the final assistant response while retaining a hard runaway guard.
const maxOpenRouterToolRounds = 32;
const maxMalformedToolCallRetries = 1;
const maxVisibleInternalIdentifierRetries = 1;

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
  projectId?: string | null;
  inputText?: string;
  telegramChatId?: string;
  telegramThreadId?: string | null;
  telegramMessageId?: string | null;
};

export type TelegramAgentRuntimeRequest = {
  input: CreateTelegramAgentRunInput;
  context: TelegramAgentRuntimeContext;
  conversation?: readonly WebAgentChatMessage[];
  onProgress?: AgentRuntimeProgressReporter;
};

export type AgentRuntimeProgressEvent = {
  id: string;
  label: string;
  state: "running" | "complete" | "error";
};

export type AgentRuntimeProgressReporter = (event: AgentRuntimeProgressEvent) => void;

export type AgentRuntime = {
  handleTelegramRequest(request: TelegramAgentRuntimeRequest): Promise<AgentRuntimeResult>;
  generateChatTitle?(firstUserMessage: string): Promise<string | null>;
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

  async generateChatTitle(_firstUserMessage: string): Promise<string | null> {
    return null;
  }
}

export class OpenRouterAgentRuntime implements AgentRuntime {
  constructor(
    private readonly config: ApiOpenRouterConfig,
    private readonly fetcher: OpenRouterFetch = defaultOpenRouterFetch,
    private readonly toolDispatcher: AgentToolOperationDispatcher = new StaticAgentToolOperationDispatcher(),
    private readonly webAppUrl: string | null = null,
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

  async generateChatTitle(firstUserMessage: string): Promise<string | null> {
    for (const model of this.getCandidateModels()) {
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
              { role: "system", content: chatTitleSystemPrompt },
              { role: "user", content: firstUserMessage },
            ],
            max_tokens: 32,
            stream: false,
          }),
        });
        if (!response.ok) continue;
        const message = readOpenRouterAssistantMessage(await response.json());
        const title = message === null ? null : readOpenRouterAssistantContent(message);
        const normalized = title === null ? null : normalizeChatTitle(title);
        if (normalized !== null) return normalized;
      } catch {}
    }
    return null;
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
      const integrationToolDefinitions =
        (await this.toolDispatcher.listToolDefinitions?.(request.context)) ?? [];
      const mergedAgentTools = mergeAgentToolDefinitions(integrationToolDefinitions);
      const mutationToolNames = new Set([
        ...coreMutationToolNames,
        ...integrationToolDefinitions.filter((tool) => !tool.readOnly).map((tool) => tool.name),
      ]);
      const messages: OpenRouterConversationMessage[] = [
        { role: "system", content: formatAgentSystemPrompt(request.context.projectId) },
        ...(request.conversation ?? [{ role: "user" as const, content: request.input.inputText }]),
      ];
      const allToolCalls: AgentRuntimeToolCall[] = [];
      let tokenUsage: Record<string, unknown> | null = null;
      const mutationRequired = looksLikeMutationRequest(request.input.inputText);
      const requiredReadTools = requestedCoreReadTools(
        request.input.inputText,
        request.context.projectId,
        request.context.telegramChatId,
      );
      const availableAgentTools =
        requiredReadTools.includes("member_list") &&
        requiredReadTools.includes("task_list") &&
        requestsNamedAssigneeTaskFilter(request.input.inputText)
          ? requireTaskListAssigneeFilter(mergedAgentTools)
          : mergedAgentTools;
      let malformedToolCallRetries = 0;
      let visibleInternalIdentifierRetries = 0;
      let forcedToolName: string | null = null;

      for (let round = 0; round < maxOpenRouterToolRounds; round += 1) {
        const thinkingId = `thinking-${round + 1}`;
        request.onProgress?.({
          id: thinkingId,
          label: round === 0 ? "Анализирую запрос" : "Планирую следующий шаг",
          state: "running",
        });
        const currentForcedToolName = forcedToolName;
        forcedToolName = null;
        const requiredReadTool =
          requiredReadTools.find(
            (toolName) => !allToolCalls.some((toolCall) => toolCall.toolName === toolName),
          ) ?? null;
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
            tools: availableAgentTools,
            tool_choice:
              currentForcedToolName !== null
                ? {
                    type: "function",
                    function: { name: currentForcedToolName },
                  }
                : requiredReadTool !== null
                  ? {
                      type: "function",
                      function: { name: requiredReadTool },
                    }
                  : mutationRequired &&
                      !hasMutationToolCall(allToolCalls, mutationToolNames) &&
                      !taskLookupNeedsClarification(allToolCalls)
                    ? "required"
                    : "auto",
            stream: false,
          }),
        });

        if (!response.ok) {
          request.onProgress?.({
            id: thinkingId,
            label: "Не удалось получить ответ модели",
            state: "error",
          });
          return buildRuntimeFailure(
            model,
            `OpenRouter request failed with status ${response.status}: ${await readOpenRouterError(response)}`,
            allToolCalls,
          );
        }

        const body = await response.json();
        request.onProgress?.({
          id: thinkingId,
          label: round === 0 ? "Запрос проанализирован" : "Следующий шаг определён",
          state: "complete",
        });
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
          if (allToolCalls.length === 0 && malformedToolCallRetries < maxMalformedToolCallRetries) {
            malformedToolCallRetries += 1;
            messages.push({
              role: "system",
              content:
                "The previous tool call was rejected because its function arguments were not valid strict JSON. Retry the same requested operation now with one valid JSON object for the function arguments.",
            });
            continue;
          }
          return buildRuntimeFailure(model, parsedToolCalls.error, allToolCalls);
        }

        if (parsedToolCalls.toolCalls.length === 0) {
          if (
            mutationRequired &&
            !hasMutationToolCall(allToolCalls, mutationToolNames) &&
            !taskLookupNeedsClarification(allToolCalls)
          ) {
            return {
              model,
              normalizedIntent: {
                kind: "openrouter_chat_completion",
                source: "telegram",
              },
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

          const finalResponse =
            formatTelegramHistoryAccessResponse(allToolCalls) ??
            formatSuccessfulToolResponse(allToolCalls, this.webAppUrl) ??
            content ??
            "No operation was performed.";
          if (
            content !== null &&
            containsVisibleInternalIdentifier(finalResponse) &&
            visibleInternalIdentifierRetries < maxVisibleInternalIdentifierRetries
          ) {
            visibleInternalIdentifierRetries += 1;
            messages.push({ role: "assistant", content });
            messages.push({
              role: "system",
              content:
                "Your previous reply exposed a full or shortened internal identifier. Rewrite the answer using only human-readable names, emails, Telegram usernames, project names, task titles, and issue identifiers. Do not mention ids, show identifier fragments, or ask the user to choose an id.",
            });
            continue;
          }

          return {
            model,
            normalizedIntent: {
              kind: "openrouter_chat_completion",
              source: "telegram",
            },
            finalResponse,
            status: "completed",
            tokenUsage,
            cost: null,
            error: null,
            toolCalls: allToolCalls,
          };
        }

        const dispatchedToolCalls = await this.dispatchToolCalls(
          parsedToolCalls.toolCalls,
          {
            ...request.context,
            inputText: request.input.inputText,
          },
          request.onProgress,
        );
        allToolCalls.push(...dispatchedToolCalls);
        const failedToolCall =
          dispatchedToolCalls.find((toolCall) => toolCall.status === "error") ?? null;

        if (failedToolCall !== null) {
          appendOpenRouterToolExchange(
            messages,
            content,
            parsedToolCalls.toolCalls,
            dispatchedToolCalls,
          );
          const recoveryToolName = readRecoveryToolName(
            failedToolCall,
            allToolCalls,
            mutationToolNames,
          );
          if (recoveryToolName !== null) {
            forcedToolName = recoveryToolName;
            messages.push({
              role: "system",
              content:
                "The supplied project id was not found. Call project_list now, then use an exact project id returned by that tool for the requested operation.",
            });
            continue;
          }
          return {
            model,
            normalizedIntent: {
              kind: "openrouter_chat_completion",
              source: "telegram",
            },
            finalResponse: `Operation failed: ${failedToolCall.error ?? "unknown tool error"}`,
            status: "failed",
            tokenUsage,
            cost: null,
            error: failedToolCall.error,
            toolCalls: allToolCalls,
          };
        }

        const selectionResponse = formatSelectionResponse(dispatchedToolCalls);
        if (selectionResponse !== null) {
          return {
            model,
            normalizedIntent: {
              kind: "task_skill_selection",
              source: "telegram",
            },
            finalResponse: selectionResponse,
            status: "completed",
            tokenUsage,
            cost: null,
            error: null,
            toolCalls: allToolCalls,
          };
        }

        appendOpenRouterToolExchange(
          messages,
          content,
          parsedToolCalls.toolCalls,
          dispatchedToolCalls,
        );
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
    onProgress?: AgentRuntimeProgressReporter,
  ): Promise<AgentRuntimeToolCall[]> {
    const dispatchedToolCalls: AgentRuntimeToolCall[] = [];

    for (const toolCall of toolCalls) {
      const label = describeToolCall(toolCall);
      onProgress?.({ id: toolCall.callId, label, state: "running" });
      const result = await this.dispatchToolCall(toolCall, context);
      dispatchedToolCalls.push(result);
      onProgress?.({
        id: toolCall.callId,
        label: result.status === "success" ? `${label} — готово` : `${label} — ошибка`,
        state: result.status === "success" ? "complete" : "error",
      });
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

function describeToolCall(call: AgentToolOperationCall): string {
  const title = readToolArgumentLabel(call.arguments, "title");
  const name = readToolArgumentLabel(call.arguments, "name");
  if (call.toolName === "project_list") return "Получаю список проектов";
  if (call.toolName === "project_get") return "Получаю проект";
  if (call.toolName === "member_list") return "Получаю участников workspace";
  if (call.toolName === "task_list") return "Получаю задачи проекта";
  if (call.toolName === "status_list") return "Получаю статусы проекта";
  if (call.toolName === "telegram_history_read") return "Читаю историю Telegram-чата";
  if (["task_skill_create", "task_skill.create"].includes(call.toolName)) {
    return `Создаю шаблон${name === null ? "" : ` «${name}»`}`;
  }
  if (["project_create", "project.create"].includes(call.toolName)) {
    return `Создаю проект${title === null ? "" : ` «${title}»`}`;
  }
  if (["task_create", "task.create", "tasks.create"].includes(call.toolName)) {
    return `Создаю задачу${title === null ? "" : ` «${title}»`}`;
  }
  if (["task_add_subtasks", "task.add_subtasks"].includes(call.toolName)) {
    return "Добавляю подзадачи";
  }
  if (call.toolName === "task_lookup") return "Ищу задачу";
  if (["task_update", "task.update"].includes(call.toolName)) return "Обновляю задачу";
  if (["task_set_status", "task.set_status"].includes(call.toolName)) {
    return "Меняю статус задачи";
  }
  if (["task_set_assignee", "task.set_assignee"].includes(call.toolName)) {
    return "Назначаю исполнителя";
  }
  if (["task_set_due_date", "task.set_due_date"].includes(call.toolName)) {
    return "Обновляю срок задачи";
  }
  if (["task_add_link_attachment", "task.add_link_attachment"].includes(call.toolName)) {
    return "Прикрепляю ссылку";
  }
  if (call.toolName.endsWith("_search")) return "Ищу во внешнем сервисе";
  if (call.toolName.endsWith("_get")) return "Получаю данные из внешнего сервиса";
  return "Выполняю действие";
}

export function mergeAgentToolDefinitions(
  integrationTools: readonly IntegrationAgentToolDefinition[],
): readonly OpenRouterAgentToolDefinition[] {
  const tools: OpenRouterAgentToolDefinition[] = [...openRouterAgentTools];
  const names = new Set(tools.map((tool) => tool.function.name));
  for (const tool of integrationTools) {
    if (names.has(tool.name)) throw new Error(`Duplicate agent tool definition ${tool.name}.`);
    tools.push({
      function: {
        description: tool.description,
        name: tool.name,
        parameters: tool.inputSchema,
      },
      type: "function",
    });
    names.add(tool.name);
  }
  return tools;
}

function requireTaskListAssigneeFilter(
  tools: readonly OpenRouterAgentToolDefinition[],
): readonly OpenRouterAgentToolDefinition[] {
  return tools.map((tool): OpenRouterAgentToolDefinition => {
    if (tool.function.name !== "task_list") return tool;
    const requiredProperties = new Set(tool.function.parameters.required ?? []);
    requiredProperties.add("assigneeUserId");
    return {
      type: "function",
      function: {
        ...tool.function,
        parameters: {
          ...tool.function.parameters,
          required: [...requiredProperties],
        },
      },
    };
  });
}

function readToolArgumentLabel(
  argumentsValue: Record<string, unknown>,
  key: string,
): string | null {
  const value = argumentsValue[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeChatTitle(value: string): string | null {
  const firstLine = value.split(/\r?\n/u)[0] ?? "";
  const topic = firstLine
    .replace(/^(?:название чата|chat title|проект|project)\s*:\s*/iu, "")
    .split(/\s+(?:шаблон|template|задачи|tasks)\s*:/iu)[0];
  const normalized = (topic ?? "")
    .replace(/^[\s"'«“]+|[\s"'»”.,!?;:]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  if (normalized.length === 0) return null;
  const concise = normalized.split(" ").slice(0, 7).join(" ");
  return concise.length <= 80 ? concise : concise.slice(0, 80).trimEnd();
}

function formatSuccessfulToolResponse(
  toolCalls: AgentRuntimeToolCall[],
  webAppUrl: string | null,
): string | null {
  const successful = toolCalls.filter((toolCall) => toolCall.status === "success");

  if (successful.length === 0) {
    return null;
  }

  const projectCalls = successful.filter((toolCall) =>
    ["project_create", "project.create"].includes(toolCall.toolName),
  );
  const taskCreateCalls = successful.filter((toolCall) =>
    ["task_create", "task.create", "tasks.create"].includes(toolCall.toolName),
  );
  const taskSkillCalls = successful.filter((toolCall) =>
    ["task_skill_create", "task_skill.create"].includes(toolCall.toolName),
  );
  const artifactSections: string[] = [];
  const summarizedTaskSkillIds = new Set<string>();
  const taskSkillNames = new Map(
    taskSkillCalls.flatMap((toolCall) => {
      const id = readResultString(toolCall.result, "id");
      const name = readResultString(toolCall.result, "name");
      return id === null || name === null ? [] : [[id, name] as const];
    }),
  );

  for (const projectCall of projectCalls) {
    const taskSkillId = readResultString(projectCall.result, "taskSkillId");
    artifactSections.push(
      formatProjectArtifact(
        projectCall.result,
        taskSkillId === null ? null : (taskSkillNames.get(taskSkillId) ?? null),
        webAppUrl,
      ),
    );
    if (taskSkillId !== null) summarizedTaskSkillIds.add(taskSkillId);
  }

  for (const taskSkillCall of taskSkillCalls) {
    const id = readResultString(taskSkillCall.result, "id");
    if (id === null || !summarizedTaskSkillIds.has(id)) {
      artifactSections.push(formatTaskSkillArtifact(taskSkillCall.result, webAppUrl));
    }
  }

  for (const taskCall of taskCreateCalls) {
    artifactSections.push(formatTaskArtifact(taskCall.result, taskCall.arguments, webAppUrl));
  }

  const parts = artifactSections.length === 0 ? [] : ["## Готово", ...artifactSections];
  const summarizedTaskUpdates = new Set<string>();

  for (const toolCall of successful) {
    const kind = readResultString(toolCall.result, "kind");
    if (kind === "task_updated") {
      const taskId =
        readResultString(toolCall.result, "taskId") ?? readResultString(toolCall.result, "id");
      const updateKey = taskId ?? `call-${summarizedTaskUpdates.size}`;
      if (!summarizedTaskUpdates.has(updateKey)) {
        summarizedTaskUpdates.add(updateKey);
        parts.push("Задача обновлена.");
      }
    }
    if (kind === "task_status_updated") {
      const statusName = readResultString(toolCall.result, "statusName");
      parts.push(
        statusName === null ? "Статус задачи удалён." : `Статус задачи: **${statusName}**.`,
      );
    }
    if (kind === "task_assignee_updated") {
      const assigneeName = readResultString(toolCall.result, "assigneeName");
      parts.push(assigneeName === null ? "Исполнитель снят." : `Исполнитель: **${assigneeName}**.`);
    }
    if (kind === "task_due_date_updated") parts.push("Срок задачи обновлён.");
    if (kind === "task_link_attachment_added") parts.push("Ссылка прикреплена к задаче.");
  }

  return parts.length === 0 ? null : parts.join("\n\n");
}

function formatProjectArtifact(
  result: Record<string, unknown> | null,
  taskSkillName: string | null,
  webAppUrl: string | null,
): string {
  const id = readResultString(result, "id") ?? readResultString(result, "projectId");
  const title = readResultString(result, "title") ?? "Новый проект";
  const workspaceSlug = readResultString(result, "workspaceSlug");
  const projectSlug = readResultString(result, "slug");
  const projectHref =
    workspaceSlug !== null && projectSlug !== null
      ? `/w/${pathSegment(workspaceSlug)}/project/${pathSegment(projectSlug)}`
      : id === null
        ? null
        : `/projects/${pathSegment(id)}`;
  const projectLabel = markdownLink(title, webAppHref(webAppUrl, projectHref));
  const taskCount = readResultNumber(result, "createdTaskCount") ?? 0;
  const subtaskCount = readResultNumber(result, "createdSubtaskCount") ?? 0;
  const taskSkillId = readResultString(result, "taskSkillId");
  const projectKey = readResultString(result, "key");
  const tasks = readResultRecords(result, "tasks");
  const lines = [`### 📁 ${projectLabel}`];

  if (taskCount > 0) {
    lines.push(
      `Создано **${taskCount} ${pluralize(taskCount, "задача", "задачи", "задач")}**${subtaskCount > 0 ? ` и **${subtaskCount} ${pluralize(subtaskCount, "подзадача", "подзадачи", "подзадач")}**` : ""}.`,
    );
  } else {
    lines.push("Проект создан.");
  }
  if (taskSkillId !== null) {
    lines.push(
      `**Шаблон:** ${markdownLink(
        taskSkillName ?? "Открыть шаблон",
        webAppHref(webAppUrl, `/templates?skill=${queryValue(taskSkillId)}`),
      )}`,
    );
  }
  if (tasks.length > 0) {
    lines.push("#### Задачи");
    for (const task of tasks) {
      lines.push(...formatTaskTree(task, projectKey, workspaceSlug, webAppUrl));
    }
  }
  return lines.join("\n");
}

function formatTaskSkillArtifact(
  result: Record<string, unknown> | null,
  webAppUrl: string | null,
): string {
  const id = readResultString(result, "id");
  const name = readResultString(result, "name") ?? "Новый шаблон";
  const subtaskCount = readResultNumber(result, "subtaskCount") ?? 0;
  const lines = [
    `### 🧩 ${markdownLink(name, webAppHref(webAppUrl, id === null ? "/templates" : `/templates?skill=${queryValue(id)}`))}`,
    `Шаблон создан${subtaskCount > 0 ? `: **${subtaskCount} ${pluralize(subtaskCount, "подзадача", "подзадачи", "подзадач")}**` : ""}.`,
  ];
  const subtasks = readResultRecords(result, "subtasks");
  if (subtasks.length > 0) {
    lines.push(
      ...subtasks.map(
        (subtask) => `- ${escapeMarkdown(readRecordString(subtask, "title") ?? "Подзадача")}`,
      ),
    );
  }
  return lines.join("\n");
}

function formatTaskArtifact(
  result: Record<string, unknown> | null,
  argumentsValue: Record<string, unknown>,
  webAppUrl: string | null,
): string {
  const title =
    readResultString(result, "title") ??
    readToolArgumentLabel(argumentsValue, "title") ??
    "Новая задача";
  const projectId = readResultString(result, "projectId");
  const projectKey = readResultString(result, "projectKey");
  const workspaceSlug = readResultString(result, "workspaceSlug");
  const number = readResultNumber(result, "number");
  const href =
    taskHref(projectKey, number, title, workspaceSlug, webAppUrl) ??
    webAppHref(webAppUrl, projectId === null ? null : `/projects/${pathSegment(projectId)}`);
  const subtasks = readResultRecords(result, "subtasks");
  const lines = [
    `### ✅ ${markdownLink(taskLabel(projectKey, number, title), href)}`,
    "Задача создана.",
  ];
  if (subtasks.length > 0) {
    lines.push("#### Подзадачи");
    for (const subtask of subtasks) {
      const subtaskTitle = readRecordString(subtask, "title") ?? "Подзадача";
      const subtaskNumber = readRecordNumber(subtask, "number");
      lines.push(
        `- ${markdownLink(
          taskLabel(projectKey, subtaskNumber, subtaskTitle),
          taskHref(projectKey, subtaskNumber, subtaskTitle, workspaceSlug, webAppUrl),
        )}`,
      );
    }
  }
  return lines.join("\n");
}

function formatTaskTree(
  task: Record<string, unknown>,
  projectKey: string | null,
  workspaceSlug: string | null,
  webAppUrl: string | null,
): string[] {
  const title = readRecordString(task, "title") ?? "Задача";
  const number = readRecordNumber(task, "number");
  const subtasks = readRecordArray(task, "subtasks").filter(isRecord);
  const suffix =
    subtasks.length === 0
      ? ""
      : ` — ${subtasks.length} ${pluralize(subtasks.length, "подзадача", "подзадачи", "подзадач")}`;
  const lines = [
    `- ${markdownLink(
      taskLabel(projectKey, number, title),
      taskHref(projectKey, number, title, workspaceSlug, webAppUrl),
    )}${suffix}`,
  ];
  for (const subtask of subtasks) {
    const subtaskTitle = readRecordString(subtask, "title") ?? "Подзадача";
    const subtaskNumber = readRecordNumber(subtask, "number");
    lines.push(
      `  - ${markdownLink(
        taskLabel(projectKey, subtaskNumber, subtaskTitle),
        taskHref(projectKey, subtaskNumber, subtaskTitle, workspaceSlug, webAppUrl),
      )}`,
    );
  }
  return lines;
}

function taskHref(
  projectKey: string | null,
  number: number | null,
  title: string,
  workspaceSlug: string | null,
  webAppUrl: string | null,
): string | null {
  if (projectKey === null || number === null) return null;
  const identifier = pathSegment(`${projectKey}-${number}`);
  const titleSlug = pathSegment(issueTitleSlug(title));
  const href =
    workspaceSlug === null
      ? `/issue/${identifier}/${titleSlug}`
      : `/w/${pathSegment(workspaceSlug)}/issue/${identifier}/${titleSlug}`;
  return webAppHref(webAppUrl, href);
}

function taskLabel(projectKey: string | null, number: number | null, title: string): string {
  return projectKey === null || number === null ? title : `${projectKey}-${number} — ${title}`;
}

function issueTitleSlug(title: string): string {
  const slug = title
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);
  return slug.length === 0 ? "issue" : slug;
}

function webAppHref(webAppUrl: string | null, href: string | null): string | null {
  if (href === null || webAppUrl === null) return href;
  return `${webAppUrl.replace(/\/$/u, "")}${href}`;
}

function markdownLink(label: string, href: string | null): string {
  const escaped = escapeMarkdown(label);
  return href === null ? escaped : `[${escaped}](${href})`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\[\]]/gu, "\\$&");
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function queryValue(value: string): string {
  return encodeURIComponent(value);
}

function pluralize(count: number, one: string, few: string, many: string): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  const last = count % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function formatSelectionResponse(toolCalls: AgentRuntimeToolCall[]): string | null {
  const selectionCall = toolCalls.find(
    (toolCall) =>
      toolCall.status === "success" &&
      readResultString(toolCall.result, "kind") === "task_skill_selection_required",
  );
  if (selectionCall?.result !== null && selectionCall?.result !== undefined) {
    const candidates = selectionCall.result["candidates"];
    if (Array.isArray(candidates) && candidates.length >= 2) {
      const choices = candidates.flatMap((candidate, index) => {
        if (!isRecord(candidate)) return [];
        const name = readRecordString(candidate, "name");
        if (name === null) return [];
        return [`${index + 1}. ${name}`];
      });
      if (choices.length >= 2) {
        const title = readResultString(selectionCall.result, "title");
        return `Для задачи${title === null ? "" : ` "${title}"`} подходят несколько шаблонов:\n${choices.join("\n")}\nКакой использовать?`;
      }
    }
  }

  const assigneeSelection = toolCalls.find(
    (toolCall) =>
      toolCall.status === "success" &&
      readResultString(toolCall.result, "kind") === "assignee_selection_required",
  );
  const assigneeChoices = formatNamedSelectionChoices(
    assigneeSelection?.result,
    "displayName",
    "email",
  );
  if (assigneeChoices.length >= 2) {
    return `Нашлось несколько подходящих исполнителей:\n${assigneeChoices.join("\n")}\nКого назначить?`;
  }

  const statusSelection = toolCalls.find(
    (toolCall) =>
      toolCall.status === "success" &&
      readResultString(toolCall.result, "kind") === "status_selection_required",
  );
  const statusChoices = formatNamedSelectionChoices(statusSelection?.result, "name", "color");
  if (statusChoices.length >= 2) {
    return `Нашлось несколько подходящих статусов:\n${statusChoices.join("\n")}\nКакой выбрать?`;
  }

  return null;
}

function formatNamedSelectionChoices(
  result: Record<string, unknown> | null | undefined,
  labelKey: string,
  detailKey: string,
): string[] {
  if (result === null || result === undefined) return [];
  const candidates = result["candidates"];
  if (!Array.isArray(candidates)) return [];
  return candidates.flatMap((candidate, index) => {
    if (!isRecord(candidate)) return [];
    const label = readRecordString(candidate, labelKey);
    const detail = readRecordString(candidate, detailKey);
    if (label === null) return [];
    return [`${index + 1}. ${label}${detail === null ? "" : ` — ${detail}`}`];
  });
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

function readResultRecords(
  result: Record<string, unknown> | null,
  key: string,
): Record<string, unknown>[] {
  if (result === null) return [];
  return readRecordArray(result, key).filter(isRecord);
}

function readRecordArray(result: Record<string, unknown>, key: string): unknown[] {
  const value = result[key];
  return Array.isArray(value) ? value : [];
}

function readRecordString(result: Record<string, unknown>, key: string): string | null {
  const value = result[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRecordNumber(result: Record<string, unknown>, key: string): number | null {
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
  const mutationVerbs = new Set([
    "add",
    "archive",
    "assign",
    "attach",
    "create",
    "delete",
    "set",
    "update",
    "добавить",
    "добавь",
    "добавьте",
    "изменить",
    "измени",
    "назначить",
    "назначь",
    "обнови",
    "обновить",
    "переименовать",
    "переименуй",
    "поставь",
    "прикрепи",
    "сними",
    "создай",
    "создайте",
    "создать",
    "удали",
    "установи",
  ]);
  return inputText
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}]+/u)
    .some((token) => mutationVerbs.has(token));
}

type CoreReadToolName =
  | "member_list"
  | "project_list"
  | "status_list"
  | "task_list"
  | "telegram_history_read";

function requestsNamedAssigneeTaskFilter(inputText: string): boolean {
  const normalized = inputText.normalize("NFKC").toLocaleLowerCase();
  const telegramHandles = normalized.match(/@[a-z0-9_]{5,32}/gu) ?? [];
  if (telegramHandles.some((handle) => !handle.endsWith("_bot"))) return true;
  return /(?:assignee|assigned\s+to|исполнител(?:ь|я|ю|е)|пользовател(?:ь|я|ю|е)|юзер(?:а|е|у)?|назначен\p{L}*\s+на)\s+["'«“@]?[\p{L}\p{N}]/iu.test(
    normalized,
  );
}

function requestedCoreReadTools(
  inputText: string,
  projectId: string | null | undefined,
  telegramChatId: string | undefined,
): CoreReadToolName[] {
  const tokens = inputText
    .normalize("NFKC")
    .toLocaleLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((token) => token.length > 0);
  const tokenSet = new Set(tokens);
  if (
    telegramChatId !== undefined &&
    [
      "above",
      "conversation",
      "discussed",
      "earlier",
      "history",
      "such",
      "previous",
      "said",
      "выше",
      "история",
      "обсуждали",
      "переписка",
      "переписке",
      "предыдущие",
      "раньше",
      "такая",
      "такие",
      "таким",
      "таких",
      "такого",
      "такое",
      "такой",
      "такую",
    ].some((token) => tokenSet.has(token))
  ) {
    return ["telegram_history_read"];
  }
  const asksForList = [
    "list",
    "show",
    "table",
    "what",
    "which",
    "какие",
    "перечисли",
    "покажи",
    "сколько",
    "таблица",
    "таблицу",
    "табличка",
    "табличку",
  ].some((token) => tokenSet.has(token));
  if (!asksForList) return [];
  if (["projects", "проектов", "проекты"].some((token) => tokenSet.has(token))) {
    return ["project_list"];
  }

  const asksForTasks = [
    "issue",
    "issues",
    "task",
    "tasks",
    "таск",
    "таски",
    "задач",
    "задача",
    "задачи",
  ].some((token) => tokenSet.has(token));
  const asksForStatuses = [
    "status",
    "statuses",
    "статус",
    "статуса",
    "статусам",
    "статусами",
    "статусов",
  ].some((token) => tokenSet.has(token));
  const hasSelectedProject = projectId !== null && projectId !== undefined;
  const requiredTools: CoreReadToolName[] = [];
  const telegramHandles = inputText.match(/@[a-z0-9_]{5,32}/giu) ?? [];
  const hasNonBotTelegramHandle = telegramHandles.some(
    (handle) => !handle.toLocaleLowerCase().endsWith("_bot"),
  );
  const asksAboutAssignee =
    hasNonBotTelegramHandle ||
    [
      "assigned",
      "assignee",
      "assignees",
      "исполнитель",
      "исполнителя",
      "исполнители",
      "исполнителю",
      "пользователь",
      "пользователе",
      "пользователи",
      "пользователя",
      "назначена",
      "назначено",
      "назначены",
      "назначить",
      "привязана",
      "привязано",
      "привязаны",
      "юзер",
      "юзере",
      "юзера",
    ].some((token) => tokenSet.has(token));
  if (asksForTasks && asksAboutAssignee) requiredTools.push("member_list");
  if (asksForTasks && !hasSelectedProject) {
    requiredTools.push("project_list");
  }
  if (asksForTasks) requiredTools.push("task_list");
  if (asksForStatuses && (hasSelectedProject || asksForTasks)) {
    requiredTools.push("status_list");
  }
  return requiredTools;
}

function formatTelegramHistoryAccessResponse(toolCalls: AgentRuntimeToolCall[]): string | null {
  const disabledCall = toolCalls.find(
    (toolCall) =>
      toolCall.status === "success" &&
      readResultString(toolCall.result, "kind") === "telegram_chat_history_unavailable" &&
      readResultString(toolCall.result, "reason") === "history_access_disabled",
  );
  if (disabledCall === undefined) return null;
  return "Чтобы я мог прочитать предыдущие сообщения, открой настройки этого Telegram-чата в tAsk и включи «Доступ к истории переписки». После включения я начну сохранять новые текстовые сообщения; сообщения, отправленные раньше, будут недоступны.";
}

function hasMutationToolCall(
  toolCalls: AgentRuntimeToolCall[],
  mutationToolNames: ReadonlySet<string>,
): boolean {
  return toolCalls.some((toolCall) => mutationToolNames.has(toolCall.toolName));
}

function readRecoveryToolName(
  failedToolCall: AgentRuntimeToolCall,
  allToolCalls: AgentRuntimeToolCall[],
  mutationToolNames: ReadonlySet<string>,
): "project_list" | null {
  if (
    failedToolCall.error !== "Project was not found." ||
    hasMutationToolCall(allToolCalls, mutationToolNames)
  ) {
    return null;
  }
  return "project_list";
}

function appendOpenRouterToolExchange(
  messages: OpenRouterConversationMessage[],
  content: string | null,
  requestedToolCalls: AgentToolOperationCall[],
  dispatchedToolCalls: AgentRuntimeToolCall[],
): void {
  messages.push({
    role: "assistant",
    content,
    tool_calls: requestedToolCalls.map(toOpenRouterConversationToolCall),
  });
  for (let index = 0; index < requestedToolCalls.length; index += 1) {
    const requestedToolCall = requestedToolCalls[index];
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

function taskLookupNeedsClarification(toolCalls: AgentRuntimeToolCall[]): boolean {
  for (let index = toolCalls.length - 1; index >= 0; index -= 1) {
    const lookup = toolCalls[index];
    if (lookup?.toolName !== "task_lookup") continue;
    if (lookup.result === null || lookup.result === undefined) return false;
    return ["task_candidates", "task_not_found"].includes(String(lookup.result["kind"]));
  }
  return false;
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
      tool_calls?: OpenRouterConversationToolCall[];
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
