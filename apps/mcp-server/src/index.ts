export const mcpServerAppPackageName = "@task/mcp-server";

export {
  type ApplyTaskSkillResponse,
  type CreateProjectInput,
  type CreateProjectRequest,
  type CreateTaskInput,
  type CreateTaskRequest,
  createTaskBackendClient,
  type GetProjectRequest,
  type GetTaskRequest,
  type ListActiveProjectsRequest,
  type ListActiveTasksRequest,
  type ListWorkspaceStatusesRequest,
  type PreviewTaskSkillApplyInput,
  type PreviewTaskSkillApplyResponse,
  type ProjectDetailResponse,
  type ProjectSummaryResponse,
  type TaskBackendClient,
  TaskBackendClientError,
  type TaskBackendClientOptions,
  type TaskBackendFetch,
  type TaskBackendFetchInit,
  type TaskBackendFetchResponse,
  type TaskBackendGetHeaders,
  type TaskBackendPostHeaders,
  type TaskDetailResponse,
  type TaskSkillApplyRequest,
  type TaskSummaryResponse,
  type UpdateTaskAssigneeInput,
  type UpdateTaskAssigneeRequest,
  type UpdateTaskDueDateInput,
  type UpdateTaskDueDateRequest,
  type UpdateTaskStatusInput,
  type UpdateTaskStatusRequest,
  type WorkspaceStatusResponse,
} from "./backend-client.js";

export {
  InvalidTaskMcpEnvironmentError,
  loadTaskMcpConfig,
  parseTaskMcpConfig,
  type TaskMcpConfig,
  type TaskMcpEnvironment,
} from "./config.js";

export {
  connectTaskMcpServerToStdio,
  createTaskMcpServer,
  registerProjectTools,
  registerStatusTools,
  registerTaskSkillApplyTools,
  registerTaskTools,
  type TaskMcpServerOptions,
  type TaskMcpToolRegistrar,
  type TaskSkillToolRegistrar,
} from "./mcp-server.js";
export {
  createProjectToolHandlers,
  type ProjectCreateToolInput,
  type ProjectGetToolInput,
  type ProjectSearchToolInput,
  type ProjectToolHandlers,
  ProjectToolInputError,
  parseProjectCreateToolInput,
  parseProjectGetToolInput,
  parseProjectSearchToolInput,
} from "./project-tools.js";
export {
  type RunTaskMcpServerOptions,
  runTaskMcpServerFromEnvironment,
  type TaskMcpServerConnector,
} from "./runtime.js";
export {
  createStatusToolHandlers,
  parseStatusListToolInput,
  type StatusListToolInput,
  type StatusToolHandlers,
  StatusToolInputError,
} from "./status-tools.js";
export {
  createTaskSkillToolHandlers,
  parseTaskSkillApplyToolInput,
  type TaskSkillApplyToolInput,
  type TaskSkillToolHandlers,
  TaskSkillToolInputError,
} from "./task-skill-tools.js";
export {
  createTaskToolHandlers,
  parseTaskCreateToolInput,
  parseTaskGetToolInput,
  parseTaskSearchToolInput,
  parseTaskSetAssigneeToolInput,
  parseTaskSetDueDateToolInput,
  parseTaskSetStatusToolInput,
  type TaskCreateToolInput,
  type TaskGetToolInput,
  type TaskSearchToolInput,
  type TaskSetAssigneeToolInput,
  type TaskSetDueDateToolInput,
  type TaskSetStatusToolInput,
  type TaskToolHandlers,
  TaskToolInputError,
} from "./task-tools.js";
