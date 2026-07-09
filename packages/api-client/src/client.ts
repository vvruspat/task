import type { components, operations } from "./generated/openapi.js";

export type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
export type DashboardOverview = components["schemas"]["DashboardOverviewDto"];
export type ConfirmationRequestSummary = components["schemas"]["ConfirmationRequestSummaryDto"];
export type ConfirmationRequestDetail = components["schemas"]["ConfirmationRequestDetailDto"];
export type CreateTaskCommentInput = components["schemas"]["CreateTaskCommentDto"];
export type CreateTaskFileAttachmentInput = components["schemas"]["CreateTaskFileAttachmentDto"];
export type CreateTaskLinkAttachmentInput = components["schemas"]["CreateTaskLinkAttachmentDto"];
export type CreateTaskTelegramFileAttachmentInput =
  components["schemas"]["CreateTaskTelegramFileAttachmentDto"];
export type HealthResponse = components["schemas"]["HealthResponseDto"];
export type ProjectDetail = components["schemas"]["ProjectDetailDto"];
export type ProjectMatrix = components["schemas"]["ProjectMatrixDto"];
export type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
export type TaskAttachment = components["schemas"]["TaskAttachmentDto"];
export type TaskActivityEvent = components["schemas"]["TaskActivityEventDto"];
export type TaskComment = components["schemas"]["TaskCommentDto"];
export type TaskDetail = components["schemas"]["TaskDetailDto"];
export type TaskSummary = components["schemas"]["TaskSummaryDto"];
export type TaskTablePage = components["schemas"]["TaskTablePageDto"];
export type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
export type TaskSkillDetail = components["schemas"]["TaskSkillDetailDto"];
export type TaskSkillVersionSummary = components["schemas"]["TaskSkillVersionSummaryDto"];
export type TaskSkillApplyPreview = components["schemas"]["TaskSkillApplyPreviewDto"];
export type TaskSkillApplyResult = components["schemas"]["TaskSkillApplyResultDto"];
export type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];
export type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];
export type WorkspaceDetail = components["schemas"]["WorkspaceDetailDto"];
export type WorkspaceMember = components["schemas"]["WorkspaceMemberDto"];
export type VerifyTelegramMiniAppInitDataInput =
  components["schemas"]["VerifyTelegramMiniAppInitDataDto"];
export type LinkedTelegramIdentity = components["schemas"]["LinkedTelegramIdentityDto"];
export type TelegramIdentityLinkStatus =
  components["schemas"]["TelegramIdentityLinkStatusDto"];

type CreateProjectOperation = operations["ProjectsController_createProject"];
type ArchiveProjectOperation = operations["ProjectsController_archiveProject"];
type UpdateProjectOperation = operations["ProjectsController_updateProject"];
type GetProjectMatrixOperation = operations["ProjectMatrixController_getProjectMatrix"];
type CreateTaskOperation = operations["TasksController_createTask"];
type UpdateTaskOperation = operations["TasksController_updateTask"];
type AddTaskSubtasksOperation = operations["TasksController_addTaskSubtasks"];
type MoveTaskOperation = operations["TasksController_moveTask"];
type UpdateTaskAssigneeOperation = operations["TasksController_updateTaskAssignee"];
type UpdateTaskDueDateOperation = operations["TasksController_updateTaskDueDate"];
type UpdateTaskStatusOperation = operations["TasksController_updateTaskStatus"];
type ListMyTasksOperation = operations["DashboardController_listMyTasks"];
type ListTaskTableOperation = operations["TasksController_listTaskTable"];
type BulkUpdateTasksOperation = operations["TasksController_bulkUpdateTasks"];
type CreateTaskSkillOperation = operations["TaskSkillsController_createTaskSkill"];
type CloneTaskSkillOperation = operations["TaskSkillsController_cloneTaskSkill"];
type GetTaskSkillOperation = operations["TaskSkillsController_getTaskSkill"];
type ArchiveTaskSkillOperation = operations["TaskSkillsController_archiveTaskSkill"];
type UpdateTaskSkillMetadataOperation = operations["TaskSkillsController_updateTaskSkillMetadata"];
type UpdateTaskSkillDefinitionOperation =
  operations["TaskSkillsController_updateTaskSkillDefinition"];
type PreviewTaskSkillApplyOperation = operations["TaskSkillsController_previewTaskSkillApply"];
type ApplyTaskSkillOperation = operations["TaskSkillsController_applyTaskSkill"];

export type CreateProjectInput =
  CreateProjectOperation["requestBody"]["content"]["application/json"];
export type ArchiveProjectResponse =
  ArchiveProjectOperation["responses"]["200"]["content"]["application/json"];
export type UpdateProjectInput =
  UpdateProjectOperation["requestBody"]["content"]["application/json"];
export type UpdateProjectResponse =
  UpdateProjectOperation["responses"]["200"]["content"]["application/json"];
export type CreateTaskInput = CreateTaskOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskInput = UpdateTaskOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskResponse =
  UpdateTaskOperation["responses"]["200"]["content"]["application/json"];
export type AddTaskSubtasksInput =
  AddTaskSubtasksOperation["requestBody"]["content"]["application/json"];
export type MoveTaskInput = MoveTaskOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskAssigneeInput =
  UpdateTaskAssigneeOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskDueDateInput =
  UpdateTaskDueDateOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskStatusInput =
  UpdateTaskStatusOperation["requestBody"]["content"]["application/json"];
export type BulkUpdateTasksInput =
  BulkUpdateTasksOperation["requestBody"]["content"]["application/json"];
export type CreateTaskSkillInput =
  CreateTaskSkillOperation["requestBody"]["content"]["application/json"];
export type CloneTaskSkillInput =
  CloneTaskSkillOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskSkillMetadataInput =
  UpdateTaskSkillMetadataOperation["requestBody"]["content"]["application/json"];
export type UpdateTaskSkillDefinitionInput =
  UpdateTaskSkillDefinitionOperation["requestBody"]["content"]["application/json"];
export type PreviewTaskSkillApplyInput =
  PreviewTaskSkillApplyOperation["requestBody"]["content"]["application/json"];
export type ApplyTaskSkillInput =
  ApplyTaskSkillOperation["requestBody"]["content"]["application/json"];
export type CreateTaskSkillResponse =
  CreateTaskSkillOperation["responses"]["201"]["content"]["application/json"];
export type CloneTaskSkillResponse =
  CloneTaskSkillOperation["responses"]["201"]["content"]["application/json"];
export type GetTaskSkillResponse =
  GetTaskSkillOperation["responses"]["200"]["content"]["application/json"];
export type ArchiveTaskSkillResponse =
  ArchiveTaskSkillOperation["responses"]["200"]["content"]["application/json"];
export type UpdateTaskSkillMetadataResponse =
  UpdateTaskSkillMetadataOperation["responses"]["200"]["content"]["application/json"];
export type UpdateTaskSkillDefinitionResponse =
  UpdateTaskSkillDefinitionOperation["responses"]["200"]["content"]["application/json"];
export type PreviewTaskSkillApplyResponse =
  PreviewTaskSkillApplyOperation["responses"]["200"]["content"]["application/json"];
export type ApplyTaskSkillResponse =
  ApplyTaskSkillOperation["responses"]["201"]["content"]["application/json"];

export type LinkTelegramMiniAppIdentityRequestInput = {
  body: VerifyTelegramMiniAppInitDataInput;
};

export type TaskApiRequestHeaders = {
  accept: "application/json";
  "content-type"?: "application/json";
  "x-task-user-id"?: string;
};

export type TaskApiRequestInit = {
  body?: string;
  headers: TaskApiRequestHeaders;
  method: "DELETE" | "GET" | "PATCH" | "POST";
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
export type ListMyTasksRequestInput = WorkspaceScopedInput &
  NonNullable<ListMyTasksOperation["parameters"]["query"]>;
export type ListTaskTableRequestInput = ProjectScopedInput &
  NonNullable<ListTaskTableOperation["parameters"]["query"]>;
export type MyTasksPage = components["schemas"]["MyTasksPageDto"];
export type ConfirmationRequestScopedInput = WorkspaceScopedInput & {
  confirmationRequestId: string;
};

export type ProjectScopedInput = WorkspaceScopedInput & {
  projectId: string;
};

export type GetProjectMatrixRequestInput = WorkspaceScopedInput &
  NonNullable<GetProjectMatrixOperation["parameters"]["path"]>;

export type CreateProjectRequestInput = WorkspaceScopedInput & {
  body: CreateProjectInput;
};

export type ArchiveProjectRequestInput = WorkspaceScopedInput & {
  projectId: string;
};

export type UpdateProjectRequestInput = ProjectScopedInput & {
  body: UpdateProjectInput;
};

export type CreateTaskRequestInput = ProjectScopedInput & {
  body: CreateTaskInput;
};

export type ArchiveTaskRequestInput = ProjectScopedInput & {
  taskId: string;
};

export type UpdateTaskRequestInput = ArchiveTaskRequestInput & {
  body: UpdateTaskInput;
};

export type AddTaskSubtasksRequestInput = TaskScopedInput & {
  body: AddTaskSubtasksInput;
};

export type MoveTaskRequestInput = TaskScopedInput & {
  body: MoveTaskInput;
};

export type UpdateTaskAssigneeRequestInput = TaskScopedInput & {
  body: UpdateTaskAssigneeInput;
};

export type UpdateTaskDueDateRequestInput = TaskScopedInput & {
  body: UpdateTaskDueDateInput;
};

export type UpdateTaskStatusRequestInput = TaskScopedInput & {
  body: UpdateTaskStatusInput;
};
export type BulkUpdateTasksRequestInput = ProjectScopedInput & { body: BulkUpdateTasksInput };

export type TaskScopedInput = ArchiveTaskRequestInput;

export type TaskSkillScopedInput = WorkspaceScopedInput & {
  taskSkillId: string;
};
export type CreateTaskSkillRequestInput = WorkspaceScopedInput & { body: CreateTaskSkillInput };
export type CloneTaskSkillRequestInput = TaskSkillScopedInput & { body: CloneTaskSkillInput };
export type UpdateTaskSkillMetadataRequestInput = TaskSkillScopedInput & {
  body: UpdateTaskSkillMetadataInput;
};
export type UpdateTaskSkillDefinitionRequestInput = TaskSkillScopedInput & {
  body: UpdateTaskSkillDefinitionInput;
};
export type PreviewTaskSkillApplyRequestInput = TaskSkillScopedInput & {
  body: PreviewTaskSkillApplyInput;
};
export type ApplyTaskSkillRequestInput = TaskSkillScopedInput & {
  body: ApplyTaskSkillInput;
};

export type CreateTaskCommentRequestInput = TaskScopedInput & {
  body: CreateTaskCommentInput;
};

export type CreateTaskLinkAttachmentRequestInput = TaskScopedInput & {
  body: CreateTaskLinkAttachmentInput;
};

export type CreateTaskFileAttachmentRequestInput = TaskScopedInput & {
  body: CreateTaskFileAttachmentInput;
};

export type CreateTaskTelegramFileAttachmentRequestInput = TaskScopedInput & {
  body: CreateTaskTelegramFileAttachmentInput;
};

export type TaskApiClient = {
  archiveProject(input: ArchiveProjectRequestInput): Promise<ArchiveProjectResponse>;
  archiveTask(input: ArchiveTaskRequestInput): Promise<TaskDetail>;
  addTaskSubtasks(input: AddTaskSubtasksRequestInput): Promise<TaskDetail[]>;
  createTaskComment(input: CreateTaskCommentRequestInput): Promise<TaskComment>;
  createTaskFileAttachment(input: CreateTaskFileAttachmentRequestInput): Promise<TaskAttachment>;
  createTaskLinkAttachment(input: CreateTaskLinkAttachmentRequestInput): Promise<TaskAttachment>;
  createTaskTelegramFileAttachment(
    input: CreateTaskTelegramFileAttachmentRequestInput,
  ): Promise<TaskAttachment>;
  createProject(input: CreateProjectRequestInput): Promise<ProjectDetail>;
  createTask(input: CreateTaskRequestInput): Promise<TaskDetail>;
  createTaskSkill(input: CreateTaskSkillRequestInput): Promise<CreateTaskSkillResponse>;
  cloneTaskSkill(input: CloneTaskSkillRequestInput): Promise<CloneTaskSkillResponse>;
  getHealth(): Promise<HealthResponse>;
  getTask(input: TaskScopedInput): Promise<TaskDetail>;
  getTaskSkill(input: TaskSkillScopedInput): Promise<GetTaskSkillResponse>;
  getDashboardOverview(input: WorkspaceScopedInput): Promise<DashboardOverview>;
  getTelegramIdentityLinkStatus(): Promise<TelegramIdentityLinkStatus>;
  getWorkspace(input: WorkspaceScopedInput): Promise<WorkspaceDetail>;
  getProjectMatrix(input: GetProjectMatrixRequestInput): Promise<ProjectMatrix>;
  listPendingConfirmationRequests(
    input: WorkspaceScopedInput,
  ): Promise<ConfirmationRequestSummary[]>;
  confirmConfirmationRequest(
    input: ConfirmationRequestScopedInput,
  ): Promise<ConfirmationRequestDetail>;
  cancelConfirmationRequest(
    input: ConfirmationRequestScopedInput,
  ): Promise<ConfirmationRequestDetail>;
  listMyTasks(input: ListMyTasksRequestInput): Promise<MyTasksPage>;
  listTaskTable(input: ListTaskTableRequestInput): Promise<TaskTablePage>;
  listAgentRuns(input: WorkspaceScopedInput): Promise<AgentRunSummary[]>;
  listTaskAttachments(input: TaskScopedInput): Promise<TaskAttachment[]>;
  listTaskActivity(input: TaskScopedInput): Promise<TaskActivityEvent[]>;
  listTaskComments(input: TaskScopedInput): Promise<TaskComment[]>;
  listProjects(input: WorkspaceScopedInput): Promise<ProjectSummary[]>;
  listStatuses(input: WorkspaceScopedInput): Promise<WorkspaceStatus[]>;
  listWorkspaceMembers(input: WorkspaceScopedInput): Promise<WorkspaceMember[]>;
  listTaskSkills(input: WorkspaceScopedInput): Promise<TaskSkillSummary[]>;
  listTasks(input: ProjectScopedInput): Promise<TaskSummary[]>;
  listWorkspaces(): Promise<WorkspaceSummary[]>;
  linkTelegramMiniAppIdentity(
    input: LinkTelegramMiniAppIdentityRequestInput,
  ): Promise<LinkedTelegramIdentity>;
  archiveTaskSkill(input: TaskSkillScopedInput): Promise<ArchiveTaskSkillResponse>;
  updateTaskSkillMetadata(
    input: UpdateTaskSkillMetadataRequestInput,
  ): Promise<UpdateTaskSkillMetadataResponse>;
  updateTaskSkillDefinition(
    input: UpdateTaskSkillDefinitionRequestInput,
  ): Promise<UpdateTaskSkillDefinitionResponse>;
  previewTaskSkillApply(
    input: PreviewTaskSkillApplyRequestInput,
  ): Promise<PreviewTaskSkillApplyResponse>;
  applyTaskSkill(input: ApplyTaskSkillRequestInput): Promise<ApplyTaskSkillResponse>;
  updateProject(input: UpdateProjectRequestInput): Promise<UpdateProjectResponse>;
  updateTask(input: UpdateTaskRequestInput): Promise<UpdateTaskResponse>;
  updateTaskAssignee(input: UpdateTaskAssigneeRequestInput): Promise<TaskDetail>;
  updateTaskDueDate(input: UpdateTaskDueDateRequestInput): Promise<TaskDetail>;
  updateTaskStatus(input: UpdateTaskStatusRequestInput): Promise<TaskDetail>;
  moveTask(input: MoveTaskRequestInput): Promise<TaskDetail>;
  bulkUpdateTasks(input: BulkUpdateTasksRequestInput): Promise<TaskDetail[]>;
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
    archiveProject: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}`,
        projectDetailParser,
        {
          method: "DELETE",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    archiveTask: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks/${encodePathSegment(input.taskId)}`,
        taskDetailParser,
        {
          method: "DELETE",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    addTaskSubtasks: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/subtasks`, taskDetailArrayParser, {
        body: input.body,
        method: "POST",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
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
    updateProject: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}`,
        projectDetailParser,
        {
          body: input.body,
          method: "PATCH",
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
    createTaskComment: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/comments`, taskCommentParser, {
        body: input.body,
        method: "POST",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    createTaskFileAttachment: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${taskPath(input)}/attachments/files`,
        taskAttachmentParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    createTaskLinkAttachment: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${taskPath(input)}/attachments/links`,
        taskAttachmentParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    createTaskTelegramFileAttachment: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${taskPath(input)}/attachments/telegram-files`,
        taskAttachmentParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    updateTask: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks/${encodePathSegment(input.taskId)}`,
        taskDetailParser,
        {
          body: input.body,
          method: "PATCH",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    moveTask: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/move`, taskDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    updateTaskStatus: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/status`, taskDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    updateTaskAssignee: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/assignee`, taskDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    updateTaskDueDate: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/due-date`, taskDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    bulkUpdateTasks: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks/bulk`,
        taskDetailArrayParser,
        {
          body: input.body,
          method: "PATCH",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    linkTelegramMiniAppIdentity: (input) =>
      request(
        options.fetch,
        baseUrl,
        "/telegram/mini-app/identity/link",
        linkedTelegramIdentityParser,
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
    getDashboardOverview: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/dashboard`,
        dashboardOverviewParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    getTelegramIdentityLinkStatus: () =>
      request(
        options.fetch,
        baseUrl,
        "/telegram/mini-app/identity/link-status",
        telegramIdentityLinkStatusParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    getWorkspace: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}`,
        workspaceDetailParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    listMyTasks: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/my-tasks${toMyTasksQuery(input)}`,
        myTasksPageParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    listTaskTable: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks/table${toTaskTableQuery(input)}`,
        taskTablePageParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    listPendingConfirmationRequests: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/confirmation-requests`,
        confirmationRequestSummaryArrayParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    confirmConfirmationRequest: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${confirmationRequestPath(input)}/confirm`,
        confirmationRequestDetailParser,
        { method: "PATCH", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
    cancelConfirmationRequest: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${confirmationRequestPath(input)}/cancel`,
        confirmationRequestDetailParser,
        { method: "PATCH", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
      ),
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
    getProjectMatrix: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/matrix`,
        projectMatrixParser,
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
    listWorkspaceMembers: (input) =>
      request(
        options.fetch,
        baseUrl,
        `/workspaces/${encodePathSegment(input.workspaceId)}/members`,
        workspaceMemberArrayParser,
        { method: "GET", requiresTrustedUserId: true, trustedUserId: options.trustedUserId },
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
    createTaskSkill: (input) =>
      request(options.fetch, baseUrl, taskSkillsPath(input), taskSkillDetailParser, {
        body: input.body,
        method: "POST",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    cloneTaskSkill: (input) =>
      request(options.fetch, baseUrl, `${taskSkillPath(input)}/clone`, taskSkillDetailParser, {
        body: input.body,
        method: "POST",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    getTaskSkill: (input) =>
      request(options.fetch, baseUrl, taskSkillPath(input), taskSkillDetailParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    archiveTaskSkill: (input) =>
      request(options.fetch, baseUrl, taskSkillPath(input), taskSkillDetailParser, {
        method: "DELETE",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    updateTaskSkillMetadata: (input) =>
      request(options.fetch, baseUrl, taskSkillPath(input), taskSkillDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    updateTaskSkillDefinition: (input) =>
      request(options.fetch, baseUrl, `${taskSkillPath(input)}/definition`, taskSkillDetailParser, {
        body: input.body,
        method: "PATCH",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    previewTaskSkillApply: (input) =>
      request(
        options.fetch,
        baseUrl,
        `${taskSkillPath(input)}/preview-apply`,
        taskSkillApplyPreviewParser,
        {
          body: input.body,
          method: "POST",
          requiresTrustedUserId: true,
          trustedUserId: options.trustedUserId,
        },
      ),
    applyTaskSkill: (input) =>
      request(options.fetch, baseUrl, `${taskSkillPath(input)}/apply`, taskSkillApplyResultParser, {
        body: input.body,
        method: "POST",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
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
    listTaskAttachments: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/attachments`, taskAttachmentArrayParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    listTaskActivity: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/activity`, taskActivityEventArrayParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    listTaskComments: (input) =>
      request(options.fetch, baseUrl, `${taskPath(input)}/comments`, taskCommentArrayParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
    getTask: (input) =>
      request(options.fetch, baseUrl, taskPath(input), taskDetailParser, {
        method: "GET",
        requiresTrustedUserId: true,
        trustedUserId: options.trustedUserId,
      }),
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

function taskPath(input: TaskScopedInput): string {
  return `/workspaces/${encodePathSegment(input.workspaceId)}/projects/${encodePathSegment(input.projectId)}/tasks/${encodePathSegment(input.taskId)}`;
}
function taskSkillsPath(input: WorkspaceScopedInput): string {
  return `/workspaces/${encodePathSegment(input.workspaceId)}/task-skills`;
}
function taskSkillPath(input: TaskSkillScopedInput): string {
  return `${taskSkillsPath(input)}/${encodePathSegment(input.taskSkillId)}`;
}
function toMyTasksQuery(input: ListMyTasksRequestInput): string {
  const parameters = new URLSearchParams();
  if (input.queue !== undefined) parameters.set("queue", input.queue);
  if (input.projectId !== undefined) parameters.set("projectId", input.projectId);
  if (input.statusId !== undefined) parameters.set("statusId", input.statusId);
  if (input.page !== undefined) parameters.set("page", String(input.page));
  if (input.pageSize !== undefined) parameters.set("pageSize", String(input.pageSize));
  const text = parameters.toString();
  return text.length === 0 ? "" : `?${text}`;
}
function toTaskTableQuery(input: ListTaskTableRequestInput): string {
  const parameters = new URLSearchParams();
  if (input.search !== undefined) parameters.set("search", input.search);
  if (input.statusId !== undefined) parameters.set("statusId", input.statusId);
  if (input.statusFilter !== undefined) parameters.set("statusFilter", input.statusFilter);
  if (input.assigneeUserId !== undefined) parameters.set("assigneeUserId", input.assigneeUserId);
  if (input.assigneeFilter !== undefined) parameters.set("assigneeFilter", input.assigneeFilter);
  if (input.dueFrom !== undefined) parameters.set("dueFrom", input.dueFrom);
  if (input.dueTo !== undefined) parameters.set("dueTo", input.dueTo);
  if (input.sortBy !== undefined) parameters.set("sortBy", input.sortBy);
  if (input.sortDirection !== undefined) parameters.set("sortDirection", input.sortDirection);
  if (input.page !== undefined) parameters.set("page", String(input.page));
  if (input.pageSize !== undefined) parameters.set("pageSize", String(input.pageSize));
  const text = parameters.toString();
  return text.length === 0 ? "" : `?${text}`;
}
function confirmationRequestPath(input: ConfirmationRequestScopedInput): string {
  return `/workspaces/${encodePathSegment(input.workspaceId)}/confirmation-requests/${encodePathSegment(input.confirmationRequestId)}`;
}

const healthResponseParser: ResponseParser<HealthResponse> = {
  isValid: isHealthResponse,
  label: "health response",
};
const workspaceDetailParser: ResponseParser<WorkspaceDetail> = {
  isValid: isWorkspaceDetail,
  label: "workspace detail",
};
const workspaceMemberArrayParser: ResponseParser<WorkspaceMember[]> = {
  isValid: (value): value is WorkspaceMember[] => isArrayOf(value, isWorkspaceMember),
  label: "workspace member list",
};
const telegramIdentityLinkStatusParser: ResponseParser<TelegramIdentityLinkStatus> = {
  isValid: isTelegramIdentityLinkStatus,
  label: "Telegram identity link status",
};
const linkedTelegramIdentityParser: ResponseParser<LinkedTelegramIdentity> = {
  isValid: isLinkedTelegramIdentity,
  label: "linked Telegram identity",
};
const dashboardOverviewParser: ResponseParser<DashboardOverview> = {
  isValid: isDashboardOverview,
  label: "dashboard overview",
};
const myTasksPageParser: ResponseParser<MyTasksPage> = {
  isValid: isMyTasksPage,
  label: "my tasks page",
};
const taskTablePageParser: ResponseParser<TaskTablePage> = {
  isValid: isTaskTablePage,
  label: "task table page",
};
const confirmationRequestSummaryArrayParser: ResponseParser<ConfirmationRequestSummary[]> = {
  isValid: (value): value is ConfirmationRequestSummary[] =>
    isArrayOf(value, isConfirmationRequest),
  label: "confirmation request list",
};
const confirmationRequestDetailParser: ResponseParser<ConfirmationRequestDetail> = {
  isValid: isConfirmationRequest,
  label: "confirmation request",
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
const projectMatrixParser: ResponseParser<ProjectMatrix> = {
  isValid: isProjectMatrix,
  label: "project matrix",
};

const taskSummaryArrayParser: ResponseParser<TaskSummary[]> = {
  isValid: (value): value is TaskSummary[] => isArrayOf(value, isTaskSummary),
  label: "task summary list",
};

const taskDetailArrayParser: ResponseParser<TaskDetail[]> = {
  isValid: (value: unknown): value is TaskDetail[] => isArrayOf(value, isTaskDetail),
  label: "task detail array",
};

const taskDetailParser: ResponseParser<TaskDetail> = {
  isValid: isTaskDetail,
  label: "task detail",
};

const taskAttachmentArrayParser: ResponseParser<TaskAttachment[]> = {
  isValid: (value): value is TaskAttachment[] => isArrayOf(value, isTaskAttachment),
  label: "task attachment list",
};

const taskActivityEventArrayParser: ResponseParser<TaskActivityEvent[]> = {
  isValid: (value: unknown): value is TaskActivityEvent[] => isArrayOf(value, isTaskActivityEvent),
  label: "task activity event array",
};

const taskAttachmentParser: ResponseParser<TaskAttachment> = {
  isValid: isTaskAttachment,
  label: "task attachment",
};

const taskCommentArrayParser: ResponseParser<TaskComment[]> = {
  isValid: (value): value is TaskComment[] => isArrayOf(value, isTaskComment),
  label: "task comment list",
};

const taskCommentParser: ResponseParser<TaskComment> = {
  isValid: isTaskComment,
  label: "task comment",
};

const taskSkillSummaryArrayParser: ResponseParser<TaskSkillSummary[]> = {
  isValid: (value): value is TaskSkillSummary[] => isArrayOf(value, isTaskSkillSummary),
  label: "task skill summary list",
};
const taskSkillDetailParser: ResponseParser<TaskSkillDetail> = {
  isValid: isTaskSkillDetail,
  label: "task skill detail",
};
const taskSkillApplyPreviewParser: ResponseParser<TaskSkillApplyPreview> = {
  isValid: isTaskSkillApplyPreview,
  label: "task skill apply preview",
};
const taskSkillApplyResultParser: ResponseParser<TaskSkillApplyResult> = {
  isValid: isTaskSkillApplyResult,
  label: "task skill apply result",
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
function isDashboardOverview(value: unknown): value is DashboardOverview {
  return (
    isJsonObject(value) &&
    isArrayOf(readProperty(value, "activeProjects"), isDashboardProject) &&
    isDashboardTaskCounts(readProperty(value, "taskCounts")) &&
    isArrayOf(readProperty(value, "recentActivity"), isDashboardActivity) &&
    isArrayOf(readProperty(value, "pendingConfirmations"), isDashboardConfirmation) &&
    isArrayOf(readProperty(value, "recentAgentRuns"), isDashboardAgentRun)
  );
}
function isMyTasksPage(value: unknown): value is MyTasksPage {
  return (
    isJsonObject(value) &&
    isArrayOf(readProperty(value, "items"), isMyTaskItem) &&
    isNonNegativeInteger(readProperty(value, "page")) &&
    isPositiveInteger(readProperty(value, "pageSize")) &&
    isNonNegativeInteger(readProperty(value, "total"))
  );
}
function isTaskTablePage(value: unknown): value is TaskTablePage {
  return (
    isJsonObject(value) &&
    isArrayOf(readProperty(value, "items"), isTaskSummary) &&
    isPositiveInteger(readProperty(value, "page")) &&
    isPositiveInteger(readProperty(value, "pageSize")) &&
    isNonNegativeInteger(readProperty(value, "total"))
  );
}
function isDashboardProject(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "title") &&
    hasNullableString(value, "status") &&
    hasString(value, "updatedAt")
  );
}
function isDashboardTaskCounts(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    isNonNegativeInteger(readProperty(value, "assigned")) &&
    isNonNegativeInteger(readProperty(value, "overdue")) &&
    isNonNegativeInteger(readProperty(value, "dueSoon"))
  );
}
function isDashboardActivity(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "eventType") &&
    hasString(value, "entityType") &&
    hasString(value, "entityId") &&
    hasNullableString(value, "actorUserId") &&
    hasString(value, "createdAt")
  );
}
function isDashboardConfirmation(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "agentRunId") &&
    hasString(value, "kind") &&
    hasString(value, "expiresAt") &&
    hasString(value, "createdAt")
  );
}
function isDashboardAgentRun(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    isAgentRunSource(readProperty(value, "source")) &&
    isAgentRunStatus(readProperty(value, "status")) &&
    hasString(value, "inputText") &&
    hasString(value, "createdAt")
  );
}
function isMyTaskItem(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "projectId") &&
    hasString(value, "projectTitle") &&
    hasString(value, "title") &&
    hasNullableString(value, "dueAt") &&
    hasNullableString(value, "statusId") &&
    hasNullableString(value, "statusName") &&
    hasNullableString(value, "statusColor") &&
    hasString(value, "position") &&
    hasString(value, "updatedAt")
  );
}
function isConfirmationRequest(value: unknown): value is ConfirmationRequestDetail {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "agentRunId") &&
    hasString(value, "userId") &&
    hasString(value, "kind") &&
    isJsonObject(readProperty(value, "preview")) &&
    hasString(value, "status") &&
    hasString(value, "expiresAt") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
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

function isProjectMatrix(value: unknown): value is ProjectMatrix {
  if (!isJsonObject(value)) return false;

  const columns = readProperty(value, "columns");
  const stages = readProperty(value, "stages");
  const cells = readProperty(value, "cells");

  if (
    !isArrayOf(columns, isTaskSummary) ||
    !isArrayOf(stages, isProjectMatrixStage) ||
    !isArrayOf(cells, isProjectMatrixCell)
  ) {
    return false;
  }
  const columnIds = new Set<string>();
  for (const column of columns) {
    const columnId = readProperty(column, "id");
    if (typeof columnId !== "string") return false;
    columnIds.add(columnId);
  }

  const stageKeys = new Set<string>();
  for (const stage of stages) {
    const stageId = readProperty(stage, "id");
    if (typeof stageId !== "string" && stageId !== null) return false;
    stageKeys.add(toProjectMatrixStageKey(stageId));
  }

  if (columnIds.size !== columns.length || stageKeys.size !== stages.length) return false;
  if (cells.length !== columns.length * stages.length) return false;

  const cellKeys = new Set<string>();
  for (const cell of cells) {
    const columnTaskId = readProperty(cell, "columnTaskId");
    const stageId = readProperty(cell, "stageId");
    if (typeof columnTaskId !== "string" || (typeof stageId !== "string" && stageId !== null)) {
      return false;
    }

    if (!columnIds.has(columnTaskId) || !stageKeys.has(toProjectMatrixStageKey(stageId))) {
      return false;
    }

    const cellKey = `${columnTaskId}:${toProjectMatrixStageKey(stageId)}`;
    if (cellKeys.has(cellKey)) return false;
    cellKeys.add(cellKey);
  }

  return cellKeys.size === columns.length * stages.length;
}

function toProjectMatrixStageKey(stageId: string | null): string {
  return stageId === null ? "null" : `status:${stageId}`;
}

function isProjectMatrixStage(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasNullableString(value, "id") &&
    hasString(value, "name") &&
    hasNullableString(value, "color") &&
    hasString(value, "position") &&
    typeof readProperty(value, "isDone") === "boolean"
  );
}

function isProjectMatrixCell(value: unknown): value is JsonObject {
  return (
    isJsonObject(value) &&
    hasString(value, "columnTaskId") &&
    hasNullableString(value, "stageId") &&
    isArrayOf(readProperty(value, "tasks"), isTaskSummary)
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

function isTaskAttachment(value: unknown): value is TaskAttachment {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    isTaskAttachmentTargetType(readProperty(value, "targetType")) &&
    hasString(value, "targetId") &&
    isTaskAttachmentKind(readProperty(value, "kind")) &&
    hasOptionalNullableString(value, "title") &&
    hasOptionalNullableString(value, "url") &&
    hasOptionalNullableString(value, "storageKey") &&
    hasOptionalNullableString(value, "telegramFileId") &&
    hasOptionalNullableString(value, "mimeType") &&
    hasOptionalNullableString(value, "sizeBytes") &&
    hasString(value, "createdByUserId") &&
    hasString(value, "createdAt")
  );
}

function isTaskActivityEvent(value: unknown): value is TaskActivityEvent {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasNullableString(value, "actorUserId") &&
    hasString(value, "eventType") &&
    hasString(value, "entityId") &&
    hasString(value, "entityType") &&
    isJsonObject(readProperty(value, "payload")) &&
    hasString(value, "createdAt")
  );
}

function isTaskComment(value: unknown): value is TaskComment {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "taskId") &&
    hasString(value, "authorUserId") &&
    hasString(value, "body") &&
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

function isTaskSkillDetail(value: unknown): value is TaskSkillDetail {
  return (
    isTaskSkillSummary(value) &&
    isArrayOf(readProperty(value, "versions"), isTaskSkillVersionSummary)
  );
}

function isTaskSkillVersionSummary(value: unknown): value is TaskSkillVersionSummary {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "taskSkillId") &&
    isNumber(readProperty(value, "version")) &&
    isJsonObject(readProperty(value, "definition")) &&
    hasString(value, "createdByUserId") &&
    hasString(value, "createdAt")
  );
}

function isTaskSkillApplyPreview(value: unknown): value is TaskSkillApplyPreview {
  return (
    isJsonObject(value) &&
    hasString(value, "workspaceId") &&
    hasString(value, "projectId") &&
    hasString(value, "taskSkillId") &&
    hasString(value, "taskSkillVersionId") &&
    isNumber(readProperty(value, "taskSkillVersion")) &&
    hasString(value, "rootTaskTitle") &&
    isArrayOf(readProperty(value, "subtasks"), isTaskSkillApplyPreviewSubtask)
  );
}

function isTaskSkillApplyPreviewSubtask(
  value: unknown,
): value is components["schemas"]["TaskSkillApplyPreviewSubtaskDto"] {
  return (
    isJsonObject(value) &&
    hasString(value, "title") &&
    (readProperty(value, "source") === "skill" || readProperty(value, "source") === "added")
  );
}

function isTaskSkillApplyResult(value: unknown): value is TaskSkillApplyResult {
  return (
    isJsonObject(value) &&
    hasString(value, "workspaceId") &&
    hasString(value, "projectId") &&
    hasString(value, "taskSkillId") &&
    hasString(value, "taskSkillVersionId") &&
    isNumber(readProperty(value, "taskSkillVersion")) &&
    isTaskDetail(readProperty(value, "rootTask")) &&
    isArrayOf(readProperty(value, "subtasks"), isTaskDetail)
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

function isWorkspaceDetail(value: unknown): value is WorkspaceDetail {
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "name") &&
    hasString(value, "slug") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt") &&
    isArrayOf(readProperty(value, "members"), isWorkspaceMember)
  );
}

function isWorkspaceMember(value: unknown): value is WorkspaceMember {
  const role = isJsonObject(value) ? readProperty(value, "role") : undefined;
  return (
    isJsonObject(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "userId") &&
    (role === "owner" || role === "admin" || role === "member" || role === "guest") &&
    hasString(value, "displayName") &&
    hasOptionalNullableString(value, "email") &&
    hasOptionalNullableString(value, "avatarUrl") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function isTelegramIdentityLinkStatus(value: unknown): value is TelegramIdentityLinkStatus {
  return (
    isJsonObject(value) &&
    hasString(value, "telegramId") &&
    hasString(value, "linkedAt") &&
    hasNullableString(value, "lastSeenAt")
  );
}

function isLinkedTelegramIdentity(value: unknown): value is LinkedTelegramIdentity {
  return isJsonObject(value) && hasString(value, "telegramId") && hasString(value, "userId");
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

function isTaskAttachmentKind(value: unknown): boolean {
  return value === "file" || value === "link" || value === "telegram_file";
}

function isTaskAttachmentTargetType(value: unknown): boolean {
  return value === "task" || value === "project" || value === "comment";
}

function hasString(value: JsonObject, key: string): boolean {
  return typeof readProperty(value, key) === "string";
}

function hasOptionalNullableString(value: JsonObject, key: string): boolean {
  const propertyValue = readProperty(value, key);
  return propertyValue === undefined || propertyValue === null || typeof propertyValue === "string";
}
function hasNullableString(value: JsonObject, key: string): boolean {
  const propertyValue = readProperty(value, key);
  return propertyValue === null || typeof propertyValue === "string";
}
function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}
function isNumber(value: unknown): boolean {
  return typeof value === "number";
}

function readString(value: JsonObject, key: string): string | null {
  const propertyValue = readProperty(value, key);
  return typeof propertyValue === "string" ? propertyValue : null;
}

function readProperty(value: JsonObject, key: string): unknown {
  return value[key];
}
