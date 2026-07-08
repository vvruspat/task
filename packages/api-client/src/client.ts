import type { components } from "./generated/openapi.js";

export type HealthResponse = components["schemas"]["HealthResponseDto"];
export type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
export type TaskSummary = components["schemas"]["TaskSummaryDto"];
export type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
export type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];
export type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];

export type TaskApiRequestHeaders = {
  accept: "application/json";
  "x-task-user-id"?: string;
};

export type TaskApiRequestInit = {
  headers: TaskApiRequestHeaders;
  method: "GET";
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

export type TaskApiClient = {
  getHealth(): Promise<HealthResponse>;
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
    getHealth: () => request(options.fetch, baseUrl, "/health", healthResponseParser, null, false),
    listProjects: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects`,
        projectSummaryArrayParser,
        options.trustedUserId,
        true,
      ),
    listStatuses: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/statuses`,
        workspaceStatusArrayParser,
        options.trustedUserId,
        true,
      ),
    listTaskSkills: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/task-skills`,
        taskSkillSummaryArrayParser,
        options.trustedUserId,
        true,
      ),
    listTasks: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks`,
        taskSummaryArrayParser,
        options.trustedUserId,
        true,
      ),
    listWorkspaces: () =>
      request(
        options.fetch,
        baseUrl,
        "/workspaces",
        workspaceSummaryArrayParser,
        options.trustedUserId,
        true,
      ),
  };
}

async function request<TResponse>(
  fetcher: TaskApiFetch,
  baseUrl: string,
  path: string,
  parser: ResponseParser<TResponse>,
  trustedUserId: string | null | undefined,
  requiresTrustedUserId: boolean,
): Promise<TResponse> {
  const headers: TaskApiRequestHeaders = {
    accept: "application/json",
  };

  if (requiresTrustedUserId) {
    headers["x-task-user-id"] = readTrustedUserId(trustedUserId);
  }

  const response = await fetcher(`${baseUrl}${path}`, {
    headers,
    method: "GET",
  });

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

const projectSummaryArrayParser: ResponseParser<ProjectSummary[]> = {
  isValid: (value): value is ProjectSummary[] => isArrayOf(value, isProjectSummary),
  label: "project summary list",
};

const taskSummaryArrayParser: ResponseParser<TaskSummary[]> = {
  isValid: (value): value is TaskSummary[] => isArrayOf(value, isTaskSummary),
  label: "task summary list",
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

function isProjectSummary(value: unknown): value is ProjectSummary {
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
