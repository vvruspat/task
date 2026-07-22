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
  WorkspaceMember,
  WorkspaceStatus,
  WorkspaceSummary,
} from "@task/api-client";

export type WorkspaceBootstrap = {
  availableWorkspaces: WorkspaceSummary[];
  currentMember: WorkspaceMember;
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

export type WorkspaceProjectReconciliation = Pick<
  ProjectData,
  "matrix" | "projectId" | "table" | "tasks"
> & {
  myTasks: MyTasksPage;
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

export function findCurrentWorkspaceMember(
  workspace: WorkspaceDetail,
  userId: string,
): WorkspaceMember | null {
  return workspace.members.find((member) => member.userId === userId) ?? null;
}

export function canManageWorkspaceSettings(role: WorkspaceMember["role"]): boolean {
  return role === "owner" || role === "admin";
}

export function canManageWorkspaceMember(actor: WorkspaceMember, member: WorkspaceMember): boolean {
  return (
    canManageWorkspaceSettings(actor.role) && actor.id !== member.id && member.role !== "owner"
  );
}

export function canLeaveWorkspace(role: WorkspaceMember["role"]): boolean {
  return role !== "owner";
}
