export const apiClientPackageName = "@task/api-client";

export {
  type CreateProjectInput,
  type CreateProjectRequestInput,
  type CreateTaskInput,
  type CreateTaskRequestInput,
  createTaskApiClient,
  type HealthResponse,
  type ProjectDetail,
  type ProjectScopedInput,
  type ProjectSummary,
  type TaskApiClient,
  TaskApiClientError,
  type TaskApiClientOptions,
  type TaskApiFetch,
  type TaskApiRequestHeaders,
  type TaskApiRequestInit,
  type TaskApiResponse,
  type TaskDetail,
  type TaskSkillSummary,
  type TaskSummary,
  type WorkspaceScopedInput,
  type WorkspaceStatus,
  type WorkspaceSummary,
} from "./client.js";
export type { components, operations, paths } from "./generated/openapi.js";
