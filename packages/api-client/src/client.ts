import type { components, operations } from "./generated/openapi.js";

export type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
export type HealthResponse = components["schemas"]["HealthResponseDto"];
export type ProjectDetail = components["schemas"]["ProjectDetailDto"];
export type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
export type TaskDetail = components["schemas"]["TaskDetailDto"];
export type TaskSummary = components["schemas"]["TaskSummaryDto"];
export type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
export type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];
export type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];

type CreateProjectOperation = operations["ProjectsController_createProject"];
type CreateTaskOperation = operations["TasksController_createTask"];

export type CreateProjectInput =
  CreateProjectOperation["requestBody"]["content"]["application/json"];
export type CreateTaskInput = CreateTaskOperation["requestBody"]["content"]["application/json"];

export type TaskApiRequestHeaders = {
  accept: "application/json";
  "content-type"?: "application/json";
  "x-task-user-id"?: string;
};

export type TaskApiRequestInit = {
  body?: string;
  headers: TaskApiRequestHeaders;
  method: "GET" | "POST";
};

export type TaskApiResponse = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
};

export type TaskApiFetch = (url: string, init: TaskApiRequestInit) => Promise<TaskApiResponse>;

export type TaskApiClientOptions = {
  baseUrl: string;
  fetch: TaskApiFetch;
  trustedUserId?: string;
};

export type WorkspaceScopedInput = {
  workspaceId: string;
};

export type ProjectScopedInput = WorkspaceScopedInput & {
  projectId: string;
};

export type CreateProjectRequestInput = WorkspaceScopedInput & {
  body: CreateProjectInput;
};

export type CreateTaskRequestInput = ProjectScopedInput & {
  body: CreateTaskInput;
};

export type TaskApiClient = {
  createProject(input: CreateProjectRequestInput): Promise<ProjectDetail>;
  createTask(input: CreateTaskRequestInput): Promise<TaskDetail>;
  getHealth(): Promise<HealthResponse>;
  listAgentRuns(input: WorkspaceScopedInput): Promise<AgentRunSummary[]>;
  listProjects(input: WorkspaceScopedInput): Promise<ProjectSummary[]>;
  listStatuses(input: WorkspaceScopedInput): Promise<WorkspaceStatus[]>;
  listTaskSkills(input: WorkspaceScopedInput): Promise<TaskSkillSummary[]>;
  listTasks(input: ProjectScopedInput): Promise<TaskSummary[]>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
};

type JsonObject = Record<string, unknown>;

type ResponseParser<TResponse> = {
  isValid(value: unknown): value is TResponse;
  label: string;
};

export class TaskApiClientError extends Error {
  readonly responseBody: string | null;
  readonly status: number | null;

  constructor(
    message: string,
    options: { responseBody?: string | null; status?: number | null } = {},
  ) {
    super(message);
    this.name = "TaskApiClientError";
    this.responseBody = options.responseBody ?? null;
    this.status = options.status ?? null;
  }
}

export function createTaskApiClient(options: TaskApiClientOptions): TaskApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    createProject: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects`,
        projectDetailParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    createTask: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks`,
        taskDetailParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    getHealth: () =>
      request(options.fetch, baseUrl, "/health", healthResponseParser, {
        method: "GET",
        requiresTrustedUserId: false,
        trustedUserId: null,
      }),
    listAgentRuns: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/agent/runs`,
        agentRunSummaryArrayParser,
        {
          method: "GET",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    listProjects: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects`,
        projectSummaryArrayParser,
        {
          method: "GET",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    listStatuses: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/statuses`,
        workspaceStatusArrayParser,
        {
          method: "GET",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    listTaskSkills: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/task-skills`,
        taskSkillSummaryArrayParser,
        {
          method: "GET",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    listTasks: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks`,
        taskSummaryArrayParser,
        {
          method: "GET",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    listWorkspaces: () =>
      request(options.fetch, baseUrl, "/workspaces", workspaceSummaryArrayParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
  };
}

type RequestOptions = {
  body?: unknown;
  method: TaskApiRequestInit["method"];
  requiresTrustedUserId: boolean;
  trustedUserId: string | null | undefined;
};

async function request<TResponse>(
  fetcher: TaskApiFetch,
  baseUrl: string,
  path: string,
  parser: ResponseParser<TResponse>,
  options: RequestOptions,
): Promise<TResponse> {
  const headers: TaskApiRequestHeaders = {
    accept: "application/json",
  };

  if (options.requiresTrustedUserId) {
    headers["x-task-user-id"] = readTrustedUserId(options.trustedUserId);
  }

  const init: TaskApiRequestInit = {
    headers,
    method: options.method,
  };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const response = await fetcher(`${baseUrl}${path}`, init);

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new TaskApiClientError(`Task API request failed with status ${response.status}.`, {
      responseBody: body,
      status: response.status,
    });
  }

  const body = await response.json();

  if (!parser.isValid(body)) {
    throw new TaskApiClientError(`Task API returned malformed ${parser.label}.`, {
      status: response.status,
    });
  }

  return body;
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();

  if (trimmed.length === 0) {
    throw new TaskApiClientError("Task API baseUrl must not be empty.");
  }

  return trimmed.replace(/\/+$/, "");
}

function readTrustedUserId(value: string | null | undefined): string {
  const trustedUserId = value?.trim();

  if (trustedUserId === undefined || trustedUserId.length === 0) {
    throw new TaskApiClientError("Task API trustedUserId is required for workspace requests.");
  }

  return trustedUserId;
}

async function readErrorBody(response: TaskApiResponse): Promise<string | null> {
  try {
    const body = await response.text();
    return body.length === 0 ? null : body;
  } catch {
    return null;
  }
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

const healthResponseParser: ResponseParser<HealthResponse> = {
  isValid: isHealthResponse,
  label: "health response",
};

const agentRunSummaryArrayParser: ResponseParser<AgentRunSummary[]> = {
  isValid: (value): value is AgentRunSummary[] => isArrayOf(value, isAgentRunSummary),
  label: "agent run summary list",
};

const projectSummaryArrayParser: ResponseParser<ProjectSummary[]> = {
  isValid: (value): value is ProjectSummary[] => isArrayOf(value, isProjectSummary),
  label: "project summary list",
};

const projectDetailParser: ResponseParser<ProjectDetail> = {
  isValid: isProjectDetail,
  label: "project detail",
};

const taskSummaryArrayParser: ResponseParser<TaskSummary[]> = {
  isValid: (value): value is TaskSummary[] => isArrayOf(value, isTaskSummary),
  label: "task summary list",
};

const taskDetailParser: ResponseParser<TaskDetail> = {
  isValid: isTaskDetail,
  label: "task detail",
};

const taskSkillSummaryArrayParser: ResponseParser<TaskSkillSummary[]> = {
  isValid: (value): value is TaskSkillSummary[] => isArrayOf(value, isTaskSkillSummary),
  label: "task skill summary list",
};

const workspaceStatusArrayParser: ResponseParser<WorkspaceStatus[]> = {
  isValid: (value): value is WorkspaceStatus[] => isArrayOf(value, isWorkspaceStatus),
  label: "workspace status list",
};

const workspaceSummaryArrayParser: ResponseParser<WorkspaceSummary[]> = {
  isValid: (value): value is WorkspaceSummary[] => isArrayOf(value, isWorkspaceSummary),
  label: "workspace summary list",
};

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    isJsonObject(value) &&
    readString(value, "status") === "ok" &&
    hasString(value, "service") &&
    hasString(value, "version")
  );
}

function isWorkspaceSummary(value: unknown): value is WorkspaceSummary {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "slug") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isAgentRunSummary(value: unknown): value is AgentRunSummary {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "userId") &&
    isAgentRunSource(readProperty(value, "source")) &&
    hasOptionalNullableString(value, "sourceMessageId") &&
    hasOptionalNullableString(value, "model") &&
    hasString(value, "inputText") &&
    hasOptionalNullableString(value, "finalResponse") &&
    isAgentRunStatus(readProperty(value, "status")) &&
    hasOptionalNullableString(value, "error") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isProjectSummary(value: unknown): value is ProjectSummary {
  return isProjectDetail(value);
}

function isProjectDetail(value: unknown): value is ProjectDetail {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "title") &&
    hasOptionalNullableString(value, "description") &&
    hasOptionalNullableString(value, "status") &&
    hasOptionalNullableString(value, "position") &&
    hasString(value, "createdByUserId") &&
    hasOptionalNullableString(value, "archivedAt") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isTaskSummary(value: unknown): value is TaskSummary {
  return isTaskDetail(value);
}

function isTaskDetail(value: unknown): value is TaskDetail {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "projectId") &&
    hasOptionalNullableString(value, "parentTaskId") &&
    hasString(value, "title") &&
    hasOptionalNullableString(value, "description") &&
    hasOptionalNullableString(value, "statusId") &&
    hasOptionalNullableString(value, "assigneeUserId") &&
    hasString(value, "createdByUserId") &&
    hasString(value, "position") &&
    hasOptionalNullableString(value, "dueAt") &&
    hasOptionalNullableString(value, "sourceSkillId") &&
    hasOptionalNullableString(value, "sourceSkillVersionId") &&
    isJsonObject(readProperty(value, "metadata")) &&
    hasOptionalNullableString(value, "archivedAt") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isTaskSkillSummary(value: unknown): value is TaskSkillSummary {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "name") &&
    hasOptionalNullableString(value, "description") &&
    isArrayOf(readProperty(value, "aliases"), isString) &&
    hasString(value, "createdByUserId") &&
    hasOptionalNullableString(value, "archivedAt") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isWorkspaceStatus(value: unknown): value is WorkspaceStatus {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "name") &&
    hasString(value, "color") &&
    hasString(value, "position") &&
    typeof readProperty(value, "isDone") === "boolean" &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayOf<TValue>(
  value: unknown,
  predicate: (item: unknown) => item is TValue,
): value is TValue[] {
  return Array.isArray(value) && value.every((item) => predicate(item));
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isAgentRunSource(value: unknown): boolean {
  return value === "telegram" || value === "web" || value === "mini_app";
}

function isAgentRunStatus(value: unknown): boolean {
  return (
    value === "running" ||
    value === "waiting_confirmation" ||
    value === "completed" ||
    value === "failed"
  );
}

function hasString(value: JsonObject, key: string): boolean {
  return typeof readProperty(value, key) === "string";
}

function hasOptionalNullableString(value: JsonObject, key: string): boolean {
  const propertyValue = readProperty(value, key);
  return propertyValue === undefined || propertyValue === null || typeof propertyValue === "string";
}

function readString(value: JsonObject, key: string): string | null {
  const propertyValue = readProperty(value, key);
  return typeof propertyValue === "string" ? propertyValue : null;
}

function readProperty(value: JsonObject, key: string): unknown {
  return value[key];
}
