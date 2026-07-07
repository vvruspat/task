export const mcpServerAppPackageName = "@task/mcp-server";

export {
  type ApplyTaskSkillResponse,
  createTaskBackendClient,
  type ListActiveProjectsRequest,
  type PreviewTaskSkillApplyInput,
  type PreviewTaskSkillApplyResponse,
  type ProjectSummaryResponse,
  type TaskBackendClient,
  TaskBackendClientError,
  type TaskBackendClientOptions,
  type TaskBackendFetch,
  type TaskBackendFetchInit,
  type TaskBackendFetchResponse,
  type TaskBackendGetHeaders,
  type TaskBackendPostHeaders,
  type TaskSkillApplyRequest,
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
  registerTaskSkillApplyTools,
  type TaskMcpServerOptions,
  type TaskMcpToolRegistrar,
  type TaskSkillToolRegistrar,
} from "./mcp-server.js";
export {
  createProjectToolHandlers,
  type ProjectSearchToolInput,
  type ProjectToolHandlers,
  ProjectToolInputError,
  parseProjectSearchToolInput,
} from "./project-tools.js";
export {
  type RunTaskMcpServerOptions,
  runTaskMcpServerFromEnvironment,
  type TaskMcpServerConnector,
} from "./runtime.js";
export {
  createTaskSkillToolHandlers,
  parseTaskSkillApplyToolInput,
  type TaskSkillApplyToolInput,
  type TaskSkillToolHandlers,
  TaskSkillToolInputError,
} from "./task-skill-tools.js";
