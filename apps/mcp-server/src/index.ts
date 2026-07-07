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
  createTaskSkillToolHandlers,
  parseTaskSkillApplyToolInput,
  type TaskSkillApplyToolInput,
  type TaskSkillToolHandlers,
  TaskSkillToolInputError,
} from "./task-skill-tools.js";
