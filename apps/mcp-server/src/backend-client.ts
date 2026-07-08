import type { components, operations } from "@task/api-client";

type PreviewTaskSkillApplyOperation = operations["TaskSkillsController_previewTaskSkillApply"];
type ApplyTaskSkillOperation = operations["TaskSkillsController_applyTaskSkill"];
type ListWorkspacesOperation = operations["WorkspacesController_listWorkspaces"];
type GetWorkspaceOperation = operations["WorkspacesController_getWorkspace"];
type ListWorkspaceMembersOperation = operations["WorkspacesController_listMembers"];
type ListWorkspaceStatusesOperation = operations["StatusesController_listStatuses"];
type ListActiveTaskSkillsOperation = operations["TaskSkillsController_listActiveTaskSkills"];
type GetTaskSkillOperation = operations["TaskSkillsController_getTaskSkill"];
type ListActiveProjectsOperation = operations["ProjectsController_listActiveProjects"];
type GetProjectOperation = operations["ProjectsController_getProject"];
type CreateProjectOperation = operations["ProjectsController_createProject"];
type ListActiveTasksOperation = operations["TasksController_listActiveTasks"];
type ListTaskCommentsOperation = operations["CommentsController_listTaskComments"];
type CreateTaskCommentOperation = operations["CommentsController_createTaskComment"];
type ListTaskAttachmentsOperation = operations["AttachmentsController_listTaskAttachments"];
type CreateTaskLinkAttachmentOperation =
  operations["AttachmentsController_createTaskLinkAttachment"];
type GetTaskOperation = operations["TasksController_getTask"];
type CreateTaskOperation = operations["TasksController_createTask"];
type UpdateTaskStatusOperation = operations["TasksController_updateTaskStatus"];
type UpdateTaskAssigneeOperation = operations["TasksController_updateTaskAssignee"];
type UpdateTaskDueDateOperation = operations["TasksController_updateTaskDueDate"];

export type PreviewTaskSkillApplyInput =
  PreviewTaskSkillApplyOperation["requestBody"]["content"]["application/json"];
export type PreviewTaskSkillApplyResponse =
  PreviewTaskSkillApplyOperation["responses"]["200"]["content"]["application/json"];
export type ApplyTaskSkillResponse =
  ApplyTaskSkillOperation["responses"]["201"]["content"]["application/json"];
export type WorkspaceSummaryResponse =
  ListWorkspacesOperation["responses"]["200"]["content"]["application/json"][number];
export type WorkspaceDetailResponse =
  GetWorkspaceOperation["responses"]["200"]["content"]["application/json"];
export type WorkspaceMemberResponse =
  ListWorkspaceMembersOperation["responses"]["200"]["content"]["application/json"][number];
export type WorkspaceStatusResponse =
  ListWorkspaceStatusesOperation["responses"]["200"]["content"]["application/json"][number];
export type TaskSkillSummaryResponse =
  ListActiveTaskSkillsOperation["responses"]["200"]["content"]["application/json"][number];
export type TaskSkillDetailResponse =
  GetTaskSkillOperation["responses"]["200"]["content"]["application/json"];
export type CreateTaskCommentInput =
  CreateTaskCommentOperation["requestBody"]["content"]["application/json"];
export type CreateTaskLinkAttachmentInput =
  CreateTaskLinkAttachmentOperation["requestBody"]["content"]["application/json"];
export type CreateProjectInput =
  CreateProjectOperation["requestBody"]["content"]["application/json"];
export type CreateTaskInput = CreateTaskOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskStatusInput =
  UpdateTaskStatusOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskAssigneeInput =
  UpdateTaskAssigneeOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskDueDateInput =
  UpdateTaskDueDateOperation["requestBody"]["content"]["application/json"];
export type ProjectSummaryResponse =
  ListActiveProjectsOperation["responses"]["200"]["content"]["application/json"][number];
export type ProjectDetailResponse =
  GetProjectOperation["responses"]["200"]["content"]["application/json"];
export type TaskSummaryResponse =
  ListActiveTasksOperation["responses"]["200"]["content"]["application/json"][number];
export type TaskCommentResponse =
  ListTaskCommentsOperation["responses"]["200"]["content"]["application/json"][number];
export type TaskAttachmentResponse =
  ListTaskAttachmentsOperation["responses"]["200"]["content"]["application/json"][number];
export type TaskDetailResponse =
  GetTaskOperation["responses"]["200"]["content"]["application/json"];
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
    }
  | {
      method: "PATCH";
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

export type ListWorkspaceStatusesRequest = {
  workspaceId: string;
  userId: string;
};

export type ListWorkspacesRequest = {
  userId: string;
};

export type GetWorkspaceRequest = {
  workspaceId: string;
  userId: string;
};

export type ListWorkspaceMembersRequest = {
  workspaceId: string;
  userId: string;
};

export type ListTaskSkillsRequest = {
  workspaceId: string;
  userId: string;
};

export type GetTaskSkillRequest = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
};

export type GetProjectRequest = {
  workspaceId: string;
  projectId: string;
  userId: string;
};

export type CreateProjectRequest = {
  workspaceId: string;
  userId: string;
  body: CreateProjectInput;
};

export type ListActiveTasksRequest = {
  workspaceId: string;
  projectId: string;
  userId: string;
};

export type ListTaskCommentsRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type CreateTaskCommentRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  body: CreateTaskCommentInput;
};

export type ListTaskAttachmentsRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type CreateTaskLinkAttachmentRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  body: CreateTaskLinkAttachmentInput;
};

export type GetTaskRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type CreateTaskRequest = {
  workspaceId: string;
  projectId: string;
  userId: string;
  body: CreateTaskInput;
};

export type UpdateTaskStatusRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  body: UpdateTaskStatusInput;
};

export type UpdateTaskAssigneeRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  body: UpdateTaskAssigneeInput;
};

export type UpdateTaskDueDateRequest = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  body: UpdateTaskDueDateInput;
};

export type TaskBackendClient = {
  listWorkspaces(request: ListWorkspacesRequest): Promise<WorkspaceSummaryResponse[]>;
  getWorkspace(request: GetWorkspaceRequest): Promise<WorkspaceDetailResponse>;
  listWorkspaceMembers(request: ListWorkspaceMembersRequest): Promise<WorkspaceMemberResponse[]>;
  listWorkspaceStatuses(request: ListWorkspaceStatusesRequest): Promise<WorkspaceStatusResponse[]>;
  listTaskSkills(request: ListTaskSkillsRequest): Promise<TaskSkillSummaryResponse[]>;
  getTaskSkill(request: GetTaskSkillRequest): Promise<TaskSkillDetailResponse>;
  listActiveProjects(request: ListActiveProjectsRequest): Promise<ProjectSummaryResponse[]>;
  getProject(request: GetProjectRequest): Promise<ProjectDetailResponse>;
  createProject(request: CreateProjectRequest): Promise<ProjectDetailResponse>;
  listActiveTasks(request: ListActiveTasksRequest): Promise<TaskSummaryResponse[]>;
  listTaskComments(request: ListTaskCommentsRequest): Promise<TaskCommentResponse[]>;
  createTaskComment(request: CreateTaskCommentRequest): Promise<TaskCommentResponse>;
  listTaskAttachments(request: ListTaskAttachmentsRequest): Promise<TaskAttachmentResponse[]>;
  createTaskLinkAttachment(
    request: CreateTaskLinkAttachmentRequest,
  ): Promise<TaskAttachmentResponse>;
  getTask(request: GetTaskRequest): Promise<TaskDetailResponse>;
  createTask(request: CreateTaskRequest): Promise<TaskDetailResponse>;
  updateTaskStatus(request: UpdateTaskStatusRequest): Promise<TaskDetailResponse>;
  updateTaskAssignee(request: UpdateTaskAssigneeRequest): Promise<TaskDetailResponse>;
  updateTaskDueDate(request: UpdateTaskDueDateRequest): Promise<TaskDetailResponse>;
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
    listWorkspaces: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspacesPath(),
        request.userId,
        readWorkspaceList,
      ),
    getWorkspace: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspacePath(request.workspaceId),
        request.userId,
        readWorkspaceDetail,
      ),
    listWorkspaceMembers: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceMembersPath(request.workspaceId),
        request.userId,
        readWorkspaceMemberList,
      ),
    listWorkspaceStatuses: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceStatusesPath(request.workspaceId),
        request.userId,
        readWorkspaceStatusList,
      ),
    listTaskSkills: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildTaskSkillsPath(request.workspaceId),
        request.userId,
        readTaskSkillSummaryList,
      ),
    getTaskSkill: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildTaskSkillPath(request.workspaceId, request.taskSkillId),
        request.userId,
        readTaskSkillDetail,
      ),
    listActiveProjects: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceProjectsPath(request.workspaceId),
        request.userId,
        readProjectSummaryList,
      ),
    getProject: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceProjectPath(request.workspaceId, request.projectId),
        request.userId,
        readProjectDetail,
      ),
    createProject: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildWorkspaceProjectsPath(request.workspaceId),
        request.userId,
        request.body,
        readProjectDetail,
      ),
    listActiveTasks: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildProjectTasksPath(request.workspaceId, request.projectId),
        request.userId,
        readTaskSummaryList,
      ),
    listTaskComments: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildTaskCommentsPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        readTaskCommentList,
      ),
    createTaskComment: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildTaskCommentsPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        request.body,
        readTaskComment,
      ),
    listTaskAttachments: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildTaskAttachmentsPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        readTaskAttachmentList,
      ),
    createTaskLinkAttachment: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildTaskAttachmentLinksPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        request.body,
        readTaskAttachment,
      ),
    getTask: (request) =>
      getJson(
        fetchImplementation,
        baseUrl,
        buildProjectTaskPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        readTaskDetail,
      ),
    createTask: (request) =>
      postJson(
        fetchImplementation,
        baseUrl,
        buildProjectTasksPath(request.workspaceId, request.projectId),
        request.userId,
        request.body,
        readTaskDetail,
      ),
    updateTaskStatus: (request) =>
      patchJson(
        fetchImplementation,
        baseUrl,
        buildProjectTaskStatusPath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        request.body,
        readTaskDetail,
      ),
    updateTaskAssignee: (request) =>
      patchJson(
        fetchImplementation,
        baseUrl,
        buildProjectTaskAssigneePath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        request.body,
        readTaskDetail,
      ),
    updateTaskDueDate: (request) =>
      patchJson(
        fetchImplementation,
        baseUrl,
        buildProjectTaskDueDatePath(request.workspaceId, request.projectId, request.taskId),
        request.userId,
        request.body,
        readTaskDetail,
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
  body:
    | PreviewTaskSkillApplyInput
    | CreateProjectInput
    | CreateTaskInput
    | CreateTaskCommentInput
    | CreateTaskLinkAttachmentInput,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  return writeJson(fetchImplementation, baseUrl, path, userId, "POST", body, readResponse);
}

async function patchJson<ResponseBody>(
  fetchImplementation: TaskBackendFetch,
  baseUrl: string,
  path: string,
  userId: string,
  body: UpdateTaskStatusInput | UpdateTaskAssigneeInput | UpdateTaskDueDateInput,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  return writeJson(fetchImplementation, baseUrl, path, userId, "PATCH", body, readResponse);
}

async function writeJson<ResponseBody>(
  fetchImplementation: TaskBackendFetch,
  baseUrl: string,
  path: string,
  userId: string,
  method: "POST" | "PATCH",
  body:
    | PreviewTaskSkillApplyInput
    | CreateProjectInput
    | CreateTaskInput
    | CreateTaskCommentInput
    | CreateTaskLinkAttachmentInput
    | UpdateTaskStatusInput
    | UpdateTaskAssigneeInput
    | UpdateTaskDueDateInput,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  const response = await fetchImplementation(`${baseUrl}${path}`, {
    method,
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

function buildTaskSkillsPath(workspaceId: string): string {
  return `${buildWorkspacePath(workspaceId)}/task-skills`;
}

function buildTaskSkillPath(workspaceId: string, taskSkillId: string): string {
  return `${buildTaskSkillsPath(workspaceId)}/${encodeURIComponent(taskSkillId)}`;
}

function buildWorkspacesPath(): string {
  return "/workspaces";
}

function buildWorkspacePath(workspaceId: string): string {
  return `${buildWorkspacesPath()}/${encodeURIComponent(workspaceId)}`;
}

function buildWorkspaceMembersPath(workspaceId: string): string {
  return `${buildWorkspacePath(workspaceId)}/members`;
}

function buildWorkspaceProjectsPath(workspaceId: string): string {
  return `${buildWorkspacePath(workspaceId)}/projects`;
}

function buildWorkspaceStatusesPath(workspaceId: string): string {
  return `${buildWorkspacePath(workspaceId)}/statuses`;
}

function buildWorkspaceProjectPath(workspaceId: string, projectId: string): string {
  return `${buildWorkspaceProjectsPath(workspaceId)}/${encodeURIComponent(projectId)}`;
}

function buildProjectTasksPath(workspaceId: string, projectId: string): string {
  return `${buildWorkspaceProjectPath(workspaceId, projectId)}/tasks`;
}

function buildProjectTaskPath(workspaceId: string, projectId: string, taskId: string): string {
  return `${buildProjectTasksPath(workspaceId, projectId)}/${encodeURIComponent(taskId)}`;
}

function buildProjectTaskStatusPath(
  workspaceId: string,
  projectId: string,
  taskId: string,
): string {
  return `${buildProjectTaskPath(workspaceId, projectId, taskId)}/status`;
}

function buildProjectTaskAssigneePath(
  workspaceId: string,
  projectId: string,
  taskId: string,
): string {
  return `${buildProjectTaskPath(workspaceId, projectId, taskId)}/assignee`;
}

function buildProjectTaskDueDatePath(
  workspaceId: string,
  projectId: string,
  taskId: string,
): string {
  return `${buildProjectTaskPath(workspaceId, projectId, taskId)}/due-date`;
}

function buildTaskCommentsPath(workspaceId: string, projectId: string, taskId: string): string {
  return `${buildProjectTaskPath(workspaceId, projectId, taskId)}/comments`;
}

function buildTaskAttachmentsPath(workspaceId: string, projectId: string, taskId: string): string {
  return `${buildProjectTaskPath(workspaceId, projectId, taskId)}/attachments`;
}

function buildTaskAttachmentLinksPath(
  workspaceId: string,
  projectId: string,
  taskId: string,
): string {
  return `${buildTaskAttachmentsPath(workspaceId, projectId, taskId)}/links`;
}

function readProjectSummaryList(value: unknown): ProjectSummaryResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("project summary list must be an array.");
  }

  return value.map(readProjectSummary);
}

function readWorkspaceList(value: unknown): WorkspaceSummaryResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("workspace summary list must be an array.");
  }

  return value.map(readWorkspaceSummary);
}

function readWorkspaceMemberList(value: unknown): WorkspaceMemberResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("workspace member list must be an array.");
  }

  return value.map(readWorkspaceMember);
}

function readWorkspaceStatusList(value: unknown): WorkspaceStatusResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("workspace status list must be an array.");
  }

  return value.map(readWorkspaceStatus);
}

function readTaskSkillSummaryList(value: unknown): TaskSkillSummaryResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("task skill summary list must be an array.");
  }

  return value.map(readTaskSkillSummary);
}

function readTaskSummaryList(value: unknown): TaskSummaryResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("task summary list must be an array.");
  }

  return value.map(readTaskSummary);
}

function readTaskCommentList(value: unknown): TaskCommentResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("task comment list must be an array.");
  }

  return value.map(readTaskComment);
}

function readTaskAttachmentList(value: unknown): TaskAttachmentResponse[] {
  if (!Array.isArray(value)) {
    throw new Error("task attachment list must be an array.");
  }

  return value.map(readTaskAttachment);
}

function readWorkspaceSummary(value: unknown): WorkspaceSummaryResponse {
  const record = readRecord(value, "workspace summary");

  return {
    id: readString(record, "id"),
    name: readString(record, "name"),
    slug: readString(record, "slug"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function readWorkspaceDetail(value: unknown): WorkspaceDetailResponse {
  const record = readRecord(value, "workspace detail");

  return {
    ...readWorkspaceSummary(record),
    members: readArray(record, "members").map(readWorkspaceMember),
  };
}

function readWorkspaceMember(value: unknown): WorkspaceMemberResponse {
  const record = readRecord(value, "workspace member");
  const role = readString(record, "role");

  if (role !== "owner" && role !== "admin" && role !== "member" && role !== "guest") {
    throw new Error("Workspace member role is invalid.");
  }

  return {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    userId: readString(record, "userId"),
    role,
    displayName: readString(record, "displayName"),
    email: readOptionalNullableString(record, "email") ?? null,
    avatarUrl: readOptionalNullableString(record, "avatarUrl") ?? null,
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function readWorkspaceStatus(value: unknown): WorkspaceStatusResponse {
  const record = readRecord(value, "workspace status");

  return {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    name: readString(record, "name"),
    color: readString(record, "color"),
    position: readString(record, "position"),
    isDone: readBoolean(record, "isDone"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function readTaskSkillSummary(value: unknown): TaskSkillSummaryResponse {
  const record = readRecord(value, "task skill summary");

  return {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    name: readString(record, "name"),
    description: readOptionalNullableString(record, "description") ?? null,
    aliases: readArray(record, "aliases").map(readStringValue),
    createdByUserId: readString(record, "createdByUserId"),
    archivedAt: readOptionalNullableString(record, "archivedAt") ?? null,
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function readTaskSkillDetail(value: unknown): TaskSkillDetailResponse {
  const record = readRecord(value, "task skill detail");

  return {
    ...readTaskSkillSummary(record),
    versions: readArray(record, "versions").map(readTaskSkillVersionSummary),
  };
}

function readTaskSkillVersionSummary(value: unknown): TaskSkillDetailResponse["versions"][number] {
  const record = readRecord(value, "task skill version summary");

  return {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    taskSkillId: readString(record, "taskSkillId"),
    version: readNumber(record, "version"),
    definition: readRecord(readProperty(record, "definition"), "task skill definition"),
    createdByUserId: readString(record, "createdByUserId"),
    createdAt: readString(record, "createdAt"),
  };
}

function readTaskComment(value: unknown): TaskCommentResponse {
  const record = readRecord(value, "task comment");

  return {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    taskId: readString(record, "taskId"),
    authorUserId: readString(record, "authorUserId"),
    body: readString(record, "body"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function readTaskAttachment(value: unknown): TaskAttachmentResponse {
  const record = readRecord(value, "task attachment");
  const targetType = readString(record, "targetType");
  const kind = readString(record, "kind");
  const attachment: TaskAttachmentResponse = {
    id: readString(record, "id"),
    workspaceId: readString(record, "workspaceId"),
    targetId: readString(record, "targetId"),
    targetType: readAttachmentTargetType(targetType),
    kind: readAttachmentKind(kind),
    createdByUserId: readString(record, "createdByUserId"),
    createdAt: readString(record, "createdAt"),
  };
  const title = readOptionalNullableString(record, "title");
  const url = readOptionalNullableString(record, "url");
  const storageKey = readOptionalNullableString(record, "storageKey");
  const telegramFileId = readOptionalNullableString(record, "telegramFileId");
  const mimeType = readOptionalNullableString(record, "mimeType");
  const sizeBytes = readOptionalNullableString(record, "sizeBytes");

  if (title !== undefined) {
    attachment.title = title;
  }

  if (url !== undefined) {
    attachment.url = url;
  }

  if (storageKey !== undefined) {
    attachment.storageKey = storageKey;
  }

  if (telegramFileId !== undefined) {
    attachment.telegramFileId = telegramFileId;
  }

  if (mimeType !== undefined) {
    attachment.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    attachment.sizeBytes = sizeBytes;
  }

  return attachment;
}

function readAttachmentTargetType(value: string): TaskAttachmentResponse["targetType"] {
  if (value !== "task" && value !== "project" && value !== "comment") {
    throw new Error("Attachment targetType is invalid.");
  }

  return value;
}

function readAttachmentKind(value: string): TaskAttachmentResponse["kind"] {
  if (value !== "file" && value !== "link" && value !== "telegram_file") {
    throw new Error("Attachment kind is invalid.");
  }

  return value;
}

function readProjectDetail(value: unknown): ProjectDetailResponse {
  const record = readRecord(value, "project detail");
  const project: ProjectDetailResponse = {
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

function readTaskSummary(value: unknown): TaskSummaryResponse {
  return readTaskDetail(value);
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

function readStringValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("value must be a string.");
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

function readBoolean(record: Record<string, unknown>, propertyName: string): boolean {
  const value = readProperty(record, propertyName);

  if (typeof value !== "boolean") {
    throw new Error(`${propertyName} must be a boolean.`);
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
