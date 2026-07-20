import type {
  AgentRunSummary,
  ConfirmationRequestSummary,
  MyTasksPage,
  ProjectMatrix,
  ProjectSummary,
  SavedView,
  TaskSkillSummary,
  TaskSummary,
  TaskTablePage,
  WorkspaceDetail,
  WorkspaceStatus,
  WorkspaceSummary,
} from "@task/api-client";

export type WorkspaceBootstrap = {
  availableWorkspaces: WorkspaceSummary[];
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
  projectKey: string;
  projectTitle: string;
  projectless: boolean;
  table: TaskTablePage;
  tasks: TaskSummary[];
};

export type ApiFailure = { error: string };
export type WorkspaceRequired = { requiresWorkspace: true };

export function isApiFailure(value: unknown): value is ApiFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  );
}

export function isWorkspaceRequired(value: unknown): value is WorkspaceRequired {
  return (
    typeof value === "object" &&
    value !== null &&
    "requiresWorkspace" in value &&
    value.requiresWorkspace === true
  );
}
