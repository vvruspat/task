import type {
  AgentRunSummary,
  ConfirmationRequestSummary,
  DashboardOverview,
  MyTasksPage,
  ProjectMatrix,
  ProjectSummary,
  SavedView,
  TaskSkillSummary,
  TaskSummary,
  TaskTablePage,
  WorkspaceDetail,
  WorkspaceStatus,
} from "@task/api-client";

export type WorkspaceBootstrap = {
  dashboard: DashboardOverview;
  myTasks: MyTasksPage;
  projects: ProjectSummary[];
  statuses: WorkspaceStatus[];
  taskSkills: TaskSkillSummary[];
  confirmations: ConfirmationRequestSummary[];
  agentRuns: AgentRunSummary[];
  workspace: WorkspaceDetail;
  projectData: ProjectData[];
  views: SavedView[];
};

export type ProjectData = {
  matrix: ProjectMatrix;
  projectId: string;
  table: TaskTablePage;
  tasks: TaskSummary[];
};

export type ApiFailure = { error: string };

export function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}
