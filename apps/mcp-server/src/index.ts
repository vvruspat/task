export const mcpServerAppPackageName = "@task/mcp-server";

export {
  type ApplyTaskSkillResponse,
  createTaskBackendClient,
  type PreviewTaskSkillApplyInput,
  type PreviewTaskSkillApplyResponse,
  type TaskBackendClient,
  TaskBackendClientError,
  type TaskBackendClientOptions,
  type TaskBackendFetch,
  type TaskBackendFetchInit,
  type TaskBackendFetchResponse,
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
  registerTaskSkillApplyTools,
  type TaskMcpServerOptions,
  type TaskSkillToolRegistrar,
} from "./mcp-server.js";
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
