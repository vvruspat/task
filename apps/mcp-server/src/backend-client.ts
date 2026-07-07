import type { components, operations } from "@task/api-client";

type PreviewTaskSkillApplyOperation = operations["TaskSkillsController_previewTaskSkillApply"];
type ApplyTaskSkillOperation = operations["TaskSkillsController_applyTaskSkill"];
type ListActiveProjectsOperation = operations["ProjectsController_listActiveProjects"];

export type PreviewTaskSkillApplyInput =
  PreviewTaskSkillApplyOperation["requestBody"]["content"]["application/json"];
export type PreviewTaskSkillApplyResponse =
  PreviewTaskSkillApplyOperation["responses"]["200"]["content"]["application/json"];
export type ApplyTaskSkillResponse =
  ApplyTaskSkillOperation["responses"]["201"]["content"]["application/json"];
export type ProjectSummaryResponse =
  ListActiveProjectsOperation["responses"]["200"]["content"]["application/json"][number];
type TaskDetailResponse = components["schemas"]["TaskDetailDto"];
type TaskSkillApplyPreviewSubtaskResponse =
  components["schemas"]["TaskSkillApplyPreviewSubtaskDto"];

export type TaskBackendFetchInit =
  | {
      method: "GET";
      headers: TaskBackendGetHeaders;
    }
  | {
      method: "POST";
      headers: TaskBackendPostHeaders;
      body: string;
    };

export type TaskBackendGetHeaders = {
  accept: string;
  "x-task-user-id": string;
};

export type TaskBackendPostHeaders = TaskBackendGetHeaders & {
  "content-type": string;
};

export type TaskBackendFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

export type TaskBackendFetch = (
  input: string,
  init: TaskBackendFetchInit,
) => Promise<TaskBackendFetchResponse>;

export type TaskBackendClientOptions = {
  baseUrl: string;
  fetch?: TaskBackendFetch;
};

export type TaskSkillApplyRequest = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  body: PreviewTaskSkillApplyInput;
};

export type ListActiveProjectsRequest = {
  workspaceId: string;
  userId: string;
};

export type TaskBackendClient = {
  listActiveProjects(request: ListActiveProjectsRequest): Promise<ProjectSummaryResponse[]>;
  previewTaskSkillApply(request: TaskSkillApplyRequest): Promise<PreviewTaskSkillApplyResponse>;
  applyTaskSkill(request: TaskSkillApplyRequest): Promise<ApplyTaskSkillResponse>;
};

export class TaskBackendClientError extends Error {
  readonly status: number;
  readonly responseBody: unknown;

  constructor(status: number, message: string, responseBody: unknown) {
    super(message);
    this.name = "TaskBackendClientError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function createTaskBackendClient(options: TaskBackendClientOptions): TaskBackendClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImplementation = options.fetch ?? defaultFetch;

  return {
    listActiveProjects: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceProjectsPath(request.workspaceId),
        request.userId,
        readProjectSummaryList,
      ),
    previewTaskSkillApply: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildTaskSkillApplyPath(request.workspaceId, request.taskSkillId, "preview-apply"),
        request.userId,
        request.body,
        readPreviewTaskSkillApplyResponse,
      ),
    applyTaskSkill: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildTaskSkillApplyPath(request.workspaceId, request.taskSkillId, "apply"),
        request.userId,
        request.body,
        readApplyTaskSkillResponse,
      ),
  };
}

async function defaultFetch(
  input: string,
  init: TaskBackendFetchInit,
): Promise<TaskBackendFetchResponse> {
  return globalThis.fetch(input, init);
}

async function postJson<ResponseBody>(
  fetchImplementation: TaskBackendFetch,
  baseUrl: string,
  path: string,
  userId: string,
  body: PreviewTaskSkillApplyInput,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  const response = await fetchImplementation(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-user-id": userId,
    },
    body: JSON.stringify(body),
  });
  const responseBody = await response.json();

  if (!response.ok) {
    throw new TaskBackendClientError(
      response.status,
      response.statusText.length === 0
        ? `Backend request failed with ${response.status}`
        : response.statusText,
      responseBody,
    );
  }

  return readResponse(responseBody);
}

async function getJson<ResponseBody>(
  fetchImplementation: TaskBackendFetch,
  baseUrl: string,
  path: string,
  userId: string,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  const response = await fetchImplementation(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-task-user-id": userId,
    },
  });
  const responseBody = await response.json();

  if (!response.ok) {
    throw new TaskBackendClientError(
      response.status,
      response.statusText.length === 0
        ? `Backend request failed with ${response.status}`
        : response.statusText,
      responseBody,
    );
  }

  return readResponse(responseBody);
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.trim();

  if (trimmedBaseUrl.length === 0) {
    throw new Error("Backend base URL must not be empty.");
  }

  return trimmedBaseUrl.endsWith("/") ? trimmedBaseUrl.slice(0, -1) : trimmedBaseUrl;
}

function buildTaskSkillApplyPath(
  workspaceId: string,
  taskSkillId: string,
  action: "apply" | "preview-apply",
): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/task-skills/${encodeURIComponent(taskSkillId)}/${action}`;
}

function buildWorkspaceProjectsPath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/projects`;
}

function readProjectSummaryList(value: unknown): ProjectSummaryResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("project summary list must be an array.");
  }

  return value.map(readProjectSummary);
}

function readProjectSummary(value: unknown): ProjectSummaryResponse {
  const record = readRecord(value, "project summary");
  const project: ProjectSummaryResponse = {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    title: readString(record, "title"),
    createdByUserId: readString(record, "createdByUserId"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
  const description = readOptionalNullableString(record, "description");
  const status = readOptionalNullableString(record, "status");
  const position = readOptionalNullableString(record, "position");
  const archivedAt = readOptionalNullableString(record, "archivedAt");

  if (description !== undefined) {
    project.description = description;
  }

  if (status !== undefined) {
    project.status = status;
  }

  if (position !== undefined) {
    project.position = position;
  }

  if (archivedAt !== undefined) {
    project.archivedAt = archivedAt;
  }

  return project;
}

function readPreviewTaskSkillApplyResponse(value: unknown): PreviewTaskSkillApplyResponse {
  const record = readRecord(value, "task skill apply preview response");

  return {
    workspaceId: readString(record, "workspaceId"),
    projectId: readString(record, "projectId"),
    taskSkillId: readString(record, "taskSkillId"),
    taskSkillVersionId: readString(record, "taskSkillVersionId"),
    taskSkillVersion: readNumber(record, "taskSkillVersion"),
    rootTaskTitle: readString(record, "rootTaskTitle"),
    subtasks: readArray(record, "subtasks").map(readTaskSkillApplyPreviewSubtask),
  };
}

function readApplyTaskSkillResponse(value: unknown): ApplyTaskSkillResponse {
  const record = readRecord(value, "task skill apply response");

  return {
    workspaceId: readString(record, "workspaceId"),
    projectId: readString(record, "projectId"),
    taskSkillId: readString(record, "taskSkillId"),
    taskSkillVersionId: readString(record, "taskSkillVersionId"),
    taskSkillVersion: readNumber(record, "taskSkillVersion"),
    rootTask: readTaskDetail(readProperty(record, "rootTask")),
    subtasks: readArray(record, "subtasks").map(readTaskDetail),
  };
}

function readTaskSkillApplyPreviewSubtask(value: unknown): TaskSkillApplyPreviewSubtaskResponse {
  const record = readRecord(value, "task skill apply preview subtask");
  const source = readString(record, "source");

  if (source !== "skill" && source !== "added") {
    throw new Error("Task skill apply preview subtask source is invalid.");
  }

  return {
    title: readString(record, "title"),
    source,
  };
}

function readTaskDetail(value: unknown): TaskDetailResponse {
  const record = readRecord(value, "task detail");
  const task: TaskDetailResponse = {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    projectId: readString(record, "projectId"),
    title: readString(record, "title"),
    createdByUserId: readString(record, "createdByUserId"),
    position: readString(record, "position"),
    metadata: readRecord(readProperty(record, "metadata"), "task metadata"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
  const parentTaskId = readOptionalNullableString(record, "parentTaskId");
  const description = readOptionalNullableString(record, "description");
  const statusId = readOptionalNullableString(record, "statusId");
  const assigneeUserId = readOptionalNullableString(record, "assigneeUserId");
  const dueAt = readOptionalNullableString(record, "dueAt");
  const sourceSkillId = readOptionalNullableString(record, "sourceSkillId");
  const sourceSkillVersionId = readOptionalNullableString(record, "sourceSkillVersionId");
  const archivedAt = readOptionalNullableString(record, "archivedAt");

  if (parentTaskId !== undefined) {
    task.parentTaskId = parentTaskId;
  }

  if (description !== undefined) {
    task.description = description;
  }

  if (statusId !== undefined) {
    task.statusId = statusId;
  }

  if (assigneeUserId !== undefined) {
    task.assigneeUserId = assigneeUserId;
  }

  if (dueAt !== undefined) {
    task.dueAt = dueAt;
  }

  if (sourceSkillId !== undefined) {
    task.sourceSkillId = sourceSkillId;
  }

  if (sourceSkillVersionId !== undefined) {
    task.sourceSkillVersionId = sourceSkillVersionId;
  }

  if (archivedAt !== undefined) {
    task.archivedAt = archivedAt;
  }

  return task;
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProperty(record: Record<string, unknown>, propertyName: string): unknown {
  return record[propertyName];
}

function readString(record: Record<string, unknown>, propertyName: string): string {
  const value = readProperty(record, propertyName);

  if (typeof value !== "string") {
    throw new Error(`${propertyName} must be a string.`);
  }

  return value;
}

function readNumber(record: Record<string, unknown>, propertyName: string): number {
  const value = readProperty(record, propertyName);

  if (typeof value !== "number") {
    throw new Error(`${propertyName} must be a number.`);
  }

  return value;
}

function readArray(record: Record<string, unknown>, propertyName: string): unknown[] {
  const value = readProperty(record, propertyName);

  if (!Array.isArray(value)) {
    throw new Error(`${propertyName} must be an array.`);
  }

  return value;
}

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = readProperty(record, propertyName);

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`${propertyName} must be a string or null.`);
  }

  return value;
}
