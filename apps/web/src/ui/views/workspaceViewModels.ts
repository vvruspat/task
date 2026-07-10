import type { components } from "@task/api-client";

type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];
type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];

export function canManageWorkspaceSettings(role: "owner" | "admin" | "member" | "guest"): boolean {
  return role === "owner" || role === "admin";
}

export type EditableWorkspaceMemberRole = "admin" | "member" | "guest";

export function buildWorkspaceMemberRoleUpdateInput(role: EditableWorkspaceMemberRole): {
  role: EditableWorkspaceMemberRole;
} {
  return { role };
}

export function buildWorkspaceStatusCreateInput(input: {
  color: string;
  isDone: boolean;
  name: string;
  position: string;
}): { color: string; isDone: boolean; name: string; position: string } {
  return { ...input, name: input.name.trim() };
}

export function shouldConfirmWorkspaceStatusDeletion(confirmed: boolean): boolean {
  return confirmed;
}

export function shouldApplySettingsWorkspaceSettlement(
  currentWorkspaceId: string | null,
  capturedWorkspaceId: string,
): boolean {
  return currentWorkspaceId === capturedWorkspaceId;
}

export function getSettingsMutationSettlement(input: {
  capturedWorkspaceId: string;
  currentWorkspaceId: string | null;
  errorMessage: string | null;
}): { errorMessage: string | null; shouldRefresh: boolean } {
  const isCurrent = shouldApplySettingsWorkspaceSettlement(
    input.currentWorkspaceId,
    input.capturedWorkspaceId,
  );
  return {
    errorMessage: isCurrent ? input.errorMessage : null,
    shouldRefresh: isCurrent && input.errorMessage === null,
  };
}

export type ProjectOverviewRow = {
  description: string;
  dueSoonTaskCount: number;
  id: string;
  latestActivityLabel: string;
  statusLabel: string;
  taskCount: number;
  title: string;
  unassignedTaskCount: number;
};

export type MyTaskRow = {
  assigneeLabel: string;
  dueDateLabel: string;
  id: string;
  projectTitle: string;
  title: string;
  updatedAtLabel: string;
};

export type MyTaskSummary = {
  assignedTaskCount: number;
  dueTaskCount: number;
  recentlyUpdatedTaskCount: number;
  taskCount: number;
};

export type KanbanTaskCard = {
  assigneeLabel: string;
  dueDateLabel: string;
  id: string;
  projectTitle: string;
  title: string;
  updatedAtLabel: string;
};

export type KanbanColumn = {
  color: string;
  id: string;
  isDone: boolean;
  name: string;
  taskCount: number;
  tasks: KanbanTaskCard[];
};

export type KanbanSummary = {
  columnCount: number;
  doneTaskCount: number;
  taskCount: number;
  unsetTaskCount: number;
};

export type MatrixCell = {
  assigneeLabel: string;
  dueDateLabel: string;
  id: string;
  title: string;
  updatedAtLabel: string;
};

export type MatrixColumn = {
  childCount: number;
  id: string;
  title: string;
  updatedAtLabel: string;
  cells: MatrixCell[];
};

export type MatrixSummary = {
  dueTaskCount: number;
  parentTaskCount: number;
  subtaskCount: number;
  unassignedTaskCount: number;
};

export type SettingsWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  updatedAtLabel: string;
};

export type SettingsSummary = {
  projectCount: number;
  selectedProjectLabel: string;
  selectedWorkspaceLabel: string;
  skillCount: number;
  statusCount: number;
  taskCount: number;
  workspaceCount: number;
};

export type AgentHistorySummary = {
  projectCount: number;
  runCount: number;
  selectedProjectLabel: string;
  selectedWorkspaceLabel: string;
  skillCount: number;
  statusCount: number;
  taskCount: number;
};

export type AgentHistoryRunRow = {
  detail: string;
  error: string | null;
  finalResponse: string | null;
  id: string;
  model: string | null;
  statusLabel: string;
  title: string;
  updatedAtLabel: string;
};

export type ProjectOverviewSummary = {
  dueSoonTaskCount: number;
  projectCount: number;
  taskCount: number;
  unassignedTaskCount: number;
};

export type ProjectParentTaskProgress = {
  completedTaskCount: number;
  id: string;
  title: string;
  totalTaskCount: number;
  updatedAtLabel: string;
};

export type ProjectDetailSummary = {
  completedTaskCount: number;
  parentTaskCount: number;
  taskCount: number;
  unassignedTaskCount: number;
};

export type ProjectActionFeedbackInput =
  | { status: "idle" | "submitting" }
  | { message: string; status: "error" | "success" };

export type TaskTableRow = {
  assigneeLabel: string;
  dueDateLabel: string;
  id: string;
  parentLabel: string;
  projectTitle: string;
  title: string;
  updatedAtLabel: string;
};

export type TaskTableSummary = {
  dueSoonTaskCount: number;
  taskCount: number;
  unassignedTaskCount: number;
};

export type TemplateSkillRow = {
  aliasLabel: string;
  description: string;
  id: string;
  name: string;
  updatedAtLabel: string;
};

export type TemplateSkillSummary = {
  skillCount: number;
  skillsWithAliasesCount: number;
  skillsWithoutDescriptionCount: number;
};

export function buildMyTaskRows(projects: ProjectSummary[], tasks: TaskSummary[]): MyTaskRow[] {
  return [...tasks].sort(compareMyTasks).map((task) => ({
    assigneeLabel: isTaskUnassigned(task) ? "Unassigned" : "Assigned",
    dueDateLabel: formatOptionalDateLabel(task.dueAt),
    id: task.id,
    projectTitle: projects.find((project) => project.id === task.projectId)?.title ?? "Unknown",
    title: task.title,
    updatedAtLabel: formatDateLabel(task.updatedAt),
  }));
}

export function buildMyTaskSummary(tasks: TaskSummary[]): MyTaskSummary {
  return {
    assignedTaskCount: tasks.filter((task) => !isTaskUnassigned(task)).length,
    dueTaskCount: tasks.filter((task) => hasDateValue(task.dueAt)).length,
    recentlyUpdatedTaskCount: countRecentlyUpdatedTasks(tasks),
    taskCount: tasks.length,
  };
}

export function buildKanbanColumns(
  projects: ProjectSummary[],
  statuses: WorkspaceStatus[],
  tasks: TaskSummary[],
): KanbanColumn[] {
  const sortedStatuses = [...statuses].sort(compareStatusPosition);
  const knownStatusIds = new Set(sortedStatuses.map((status) => status.id));
  const columns = sortedStatuses.map((status) => {
    const statusTasks = tasks.filter((task) => task.statusId === status.id);

    return {
      color: status.color,
      id: status.id,
      isDone: status.isDone,
      name: status.name,
      taskCount: statusTasks.length,
      tasks: buildKanbanTaskCards(projects, statusTasks),
    };
  });
  const unknownStatusTasks = tasks.filter(
    (task) => hasStatusValue(task.statusId) && !knownStatusIds.has(task.statusId),
  );
  const unsetStatusTasks = tasks.filter((task) => !hasStatusValue(task.statusId));

  if (unknownStatusTasks.length > 0) {
    columns.push({
      color: "#d8d1c4",
      id: "unknown-status",
      isDone: false,
      name: "Unknown status",
      taskCount: unknownStatusTasks.length,
      tasks: buildKanbanTaskCards(projects, unknownStatusTasks),
    });
  }

  columns.push({
    color: "#d8d1c4",
    id: "unset-status",
    isDone: false,
    name: "Unset",
    taskCount: unsetStatusTasks.length,
    tasks: buildKanbanTaskCards(projects, unsetStatusTasks),
  });

  return columns;
}

export function buildKanbanSummary(
  statuses: WorkspaceStatus[],
  tasks: TaskSummary[],
): KanbanSummary {
  const doneStatusIds = new Set(
    statuses.filter((status) => status.isDone).map((status) => status.id),
  );
  const knownStatusIds = new Set(statuses.map((status) => status.id));
  const hasUnknownStatusTasks = tasks.some(
    (task) => hasStatusValue(task.statusId) && !knownStatusIds.has(task.statusId),
  );

  return {
    columnCount: statuses.length + 1 + (hasUnknownStatusTasks ? 1 : 0),
    doneTaskCount: tasks.filter(
      (task) => hasStatusValue(task.statusId) && doneStatusIds.has(task.statusId),
    ).length,
    taskCount: tasks.length,
    unsetTaskCount: tasks.filter((task) => !hasStatusValue(task.statusId)).length,
  };
}

export function getAdjacentKanbanStatusId(
  statuses: WorkspaceStatus[],
  currentStatusId: string | null,
  direction: "next" | "previous",
): string | null {
  const statusIds = [null, ...[...statuses].sort(compareStatusPosition).map((status) => status.id)];
  const currentIndex = statusIds.indexOf(currentStatusId);
  if (currentIndex === -1) return currentStatusId;
  const adjacentIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (adjacentIndex < 0 || adjacentIndex >= statusIds.length) return currentStatusId;
  const adjacentStatusId = statusIds[adjacentIndex];
  return adjacentStatusId === undefined ? currentStatusId : adjacentStatusId;
}

export function buildMatrixColumns(tasks: TaskSummary[]): MatrixColumn[] {
  const parentTasks = [...tasks]
    .filter((task) => !hasParentTaskValue(task.parentTaskId))
    .sort(compareTaskPosition);
  const parentTaskIds = new Set(parentTasks.map((task) => task.id));
  const columns = parentTasks.map((parentTask) => {
    const childTasks = tasks
      .filter((task) => task.parentTaskId === parentTask.id)
      .sort(compareTaskPosition);

    return {
      cells: buildMatrixCells(childTasks),
      childCount: childTasks.length,
      id: parentTask.id,
      title: parentTask.title,
      updatedAtLabel: formatDateLabel(parentTask.updatedAt),
    };
  });
  const unmatchedTasks = tasks
    .filter(
      (task) => hasParentTaskValue(task.parentTaskId) && !parentTaskIds.has(task.parentTaskId),
    )
    .sort(compareTaskPosition);

  if (unmatchedTasks.length > 0) {
    columns.push({
      cells: buildMatrixCells(unmatchedTasks),
      childCount: unmatchedTasks.length,
      id: "unmatched-parent",
      title: "Unmatched parent",
      updatedAtLabel: readLatestTaskUpdateLabel(unmatchedTasks),
    });
  }

  return columns;
}

export function buildMatrixSummary(tasks: TaskSummary[]): MatrixSummary {
  const parentTasks = tasks.filter((task) => !hasParentTaskValue(task.parentTaskId));
  const subtaskCount = tasks.length - parentTasks.length;

  return {
    dueTaskCount: countDueSoonTasks(tasks),
    parentTaskCount: parentTasks.length,
    subtaskCount,
    unassignedTaskCount: tasks.filter(isTaskUnassigned).length,
  };
}

export function buildSettingsWorkspaceRows(workspaces: WorkspaceSummary[]): SettingsWorkspaceRow[] {
  return workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    updatedAtLabel: formatDateLabel(workspace.updatedAt),
  }));
}

export function buildSettingsSummary(input: {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
}): SettingsSummary {
  return {
    projectCount: input.projects.length,
    selectedProjectLabel:
      input.projects.find((project) => project.id === input.selectedProjectId)?.title ??
      "No selected project",
    selectedWorkspaceLabel:
      input.workspaces.find((workspace) => workspace.id === input.selectedWorkspaceId)?.name ??
      "No selected workspace",
    skillCount: input.skills.length,
    statusCount: input.statuses.length,
    taskCount: input.tasks.length,
    workspaceCount: input.workspaces.length,
  };
}

export function getTelegramMiniAppInitData(
  value: unknown = typeof window === "undefined" ? undefined : window,
): string | null {
  if (!isUnknownRecord(value)) return null;
  const telegram = readUnknownProperty(value, "Telegram");
  if (!isUnknownRecord(telegram)) return null;
  const webApp = readUnknownProperty(telegram, "WebApp");
  if (!isUnknownRecord(webApp)) return null;
  const initData = readUnknownProperty(webApp, "initData");
  return typeof initData === "string" && initData.trim().length > 0 ? initData : null;
}

export function isTelegramIdentityUnlinkedError(error: unknown): boolean {
  if (!isUnknownRecord(error)) return false;
  const status = readUnknownProperty(error, "status");
  return status === 403 || status === 404;
}

export function shouldShowTelegramLinkAction(input: {
  initData: string | null;
  linkState: "unlinked" | "linked" | "loading" | "error" | "unavailable";
}): boolean {
  return input.linkState === "unlinked" && input.initData !== null;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readUnknownProperty(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

export function buildAgentHistorySummary(input: {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
}): AgentHistorySummary {
  return {
    projectCount: input.projects.length,
    runCount: input.agentRuns.length,
    selectedProjectLabel:
      input.projects.find((project) => project.id === input.selectedProjectId)?.title ??
      "No selected project",
    selectedWorkspaceLabel:
      input.workspaces.find((workspace) => workspace.id === input.selectedWorkspaceId)?.name ??
      "No selected workspace",
    skillCount: input.skills.length,
    statusCount: input.statuses.length,
    taskCount: input.tasks.length,
  };
}

export function buildAgentHistoryRows(agentRuns: AgentRunSummary[]): AgentHistoryRunRow[] {
  return agentRuns.map((run) => ({
    detail: `${run.source} - ${formatDateLabel(run.createdAt)}`,
    error: run.error ?? null,
    finalResponse: run.finalResponse ?? null,
    id: run.id,
    model: run.model ?? null,
    statusLabel: run.status,
    title: run.inputText,
    updatedAtLabel: formatDateLabel(run.updatedAt),
  }));
}

export function filterTemplateSkillRows(
  skills: TaskSkillSummary[],
  query: string,
): ReturnType<typeof buildTemplateSkillRows> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rows = buildTemplateSkillRows(skills);

  if (normalizedQuery.length === 0) {
    return rows;
  }

  return rows.filter((skill) =>
    [skill.name, skill.description, skill.aliasLabel].some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );
}

export function filterAgentHistoryRows(
  agentRuns: AgentRunSummary[],
  query: string,
): AgentHistoryRunRow[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const rows = buildAgentHistoryRows(agentRuns);

  if (normalizedQuery.length === 0) {
    return rows;
  }

  return rows.filter((run) =>
    [
      run.title,
      run.detail,
      run.statusLabel,
      run.model ?? "",
      run.finalResponse ?? "",
      run.error ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export function buildProjectOverviewRows(
  projects: ProjectSummary[],
  tasks: TaskSummary[],
): ProjectOverviewRow[] {
  return projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const latestActivity = projectTasks.reduce(
      (currentLatest, task) => maxIsoTimestamp(currentLatest, task.updatedAt),
      project.updatedAt,
    );

    return {
      description: project.description ?? "No description",
      dueSoonTaskCount: countDueSoonTasks(projectTasks),
      id: project.id,
      latestActivityLabel: formatDateLabel(latestActivity),
      statusLabel: project.status ?? "Active",
      taskCount: projectTasks.length,
      title: project.title,
      unassignedTaskCount: projectTasks.filter(isTaskUnassigned).length,
    };
  });
}

export function buildProjectOverviewSummary(
  projects: ProjectSummary[],
  tasks: TaskSummary[],
): ProjectOverviewSummary {
  return {
    dueSoonTaskCount: countDueSoonTasks(tasks),
    projectCount: projects.length,
    taskCount: tasks.length,
    unassignedTaskCount: tasks.filter(isTaskUnassigned).length,
  };
}

export function buildProjectDetailSummary(
  tasks: TaskSummary[],
  doneStatusIds: ReadonlySet<string>,
): ProjectDetailSummary {
  return {
    completedTaskCount: tasks.filter(
      (task) =>
        task.statusId !== null && task.statusId !== undefined && doneStatusIds.has(task.statusId),
    ).length,
    parentTaskCount: tasks.filter((task) => !hasParentTaskValue(task.parentTaskId)).length,
    taskCount: tasks.length,
    unassignedTaskCount: tasks.filter(isTaskUnassigned).length,
  };
}

export function formatProjectActionFeedback(
  action: string,
  state: ProjectActionFeedbackInput,
): string | null {
  if (!("message" in state)) {
    return null;
  }
  return `${action}: ${state.message}`;
}

export function buildProjectParentTaskProgress(
  tasks: TaskSummary[],
  doneStatusIds: ReadonlySet<string>,
): ProjectParentTaskProgress[] {
  return tasks
    .filter((task) => !hasParentTaskValue(task.parentTaskId))
    .sort(compareTaskPosition)
    .map((parentTask) => {
      const childTasks = tasks.filter((task) => task.parentTaskId === parentTask.id);
      const progressTasks = childTasks.length === 0 ? [parentTask] : childTasks;

      return {
        completedTaskCount: progressTasks.filter(
          (task) =>
            task.statusId !== null &&
            task.statusId !== undefined &&
            doneStatusIds.has(task.statusId),
        ).length,
        id: parentTask.id,
        title: parentTask.title,
        totalTaskCount: progressTasks.length,
        updatedAtLabel: formatDateLabel(parentTask.updatedAt),
      };
    });
}

export function buildTaskTableRows(
  projects: ProjectSummary[],
  tasks: TaskSummary[],
): TaskTableRow[] {
  return tasks.map((task) => ({
    assigneeLabel: isTaskUnassigned(task) ? "Unassigned" : "Assigned",
    dueDateLabel: formatOptionalDateLabel(task.dueAt),
    id: task.id,
    parentLabel: readParentTaskLabel(task, tasks),
    projectTitle: projects.find((project) => project.id === task.projectId)?.title ?? "Unknown",
    title: task.title,
    updatedAtLabel: formatDateLabel(task.updatedAt),
  }));
}

export function buildTaskTableSummary(tasks: TaskSummary[]): TaskTableSummary {
  return {
    dueSoonTaskCount: countDueSoonTasks(tasks),
    taskCount: tasks.length,
    unassignedTaskCount: tasks.filter(isTaskUnassigned).length,
  };
}

export function buildTemplateSkillRows(skills: TaskSkillSummary[]): TemplateSkillRow[] {
  return skills.map((skill) => ({
    aliasLabel: skill.aliases.length === 0 ? "No aliases" : skill.aliases.join(", "),
    description: hasTextValue(skill.description) ? skill.description : "No description",
    id: skill.id,
    name: skill.name,
    updatedAtLabel: formatDateLabel(skill.updatedAt),
  }));
}

export function buildTemplateSkillSummary(skills: TaskSkillSummary[]): TemplateSkillSummary {
  return {
    skillCount: skills.length,
    skillsWithAliasesCount: skills.filter((skill) => skill.aliases.length > 0).length,
    skillsWithoutDescriptionCount: skills.filter((skill) => !hasTextValue(skill.description))
      .length,
  };
}

function countDueSoonTasks(tasks: TaskSummary[]): number {
  return tasks.filter((task) => hasDateValue(task.dueAt)).length;
}

function countRecentlyUpdatedTasks(tasks: TaskSummary[]): number {
  const latestUpdate = tasks.reduce<string | null>(
    (currentLatest, task) =>
      currentLatest === null ? task.updatedAt : maxIsoTimestamp(currentLatest, task.updatedAt),
    null,
  );

  if (latestUpdate === null) {
    return 0;
  }

  const latestUpdateDate = formatDateLabel(latestUpdate);
  return tasks.filter((task) => formatDateLabel(task.updatedAt) === latestUpdateDate).length;
}

function compareMyTasks(firstTask: TaskSummary, secondTask: TaskSummary): number {
  const firstDueRank = hasDateValue(firstTask.dueAt) ? 0 : 1;
  const secondDueRank = hasDateValue(secondTask.dueAt) ? 0 : 1;

  if (firstDueRank !== secondDueRank) {
    return firstDueRank - secondDueRank;
  }

  if (hasDateValue(firstTask.dueAt) && hasDateValue(secondTask.dueAt)) {
    return firstTask.dueAt.localeCompare(secondTask.dueAt);
  }

  return secondTask.updatedAt.localeCompare(firstTask.updatedAt);
}

function buildKanbanTaskCards(projects: ProjectSummary[], tasks: TaskSummary[]): KanbanTaskCard[] {
  return [...tasks]
    .sort((firstTask, secondTask) => secondTask.updatedAt.localeCompare(firstTask.updatedAt))
    .map((task) => ({
      assigneeLabel: isTaskUnassigned(task) ? "Unassigned" : "Assigned",
      dueDateLabel: formatOptionalDateLabel(task.dueAt),
      id: task.id,
      projectTitle: projects.find((project) => project.id === task.projectId)?.title ?? "Unknown",
      title: task.title,
      updatedAtLabel: formatDateLabel(task.updatedAt),
    }));
}

function buildMatrixCells(tasks: TaskSummary[]): MatrixCell[] {
  return tasks.map((task) => ({
    assigneeLabel: isTaskUnassigned(task) ? "Unassigned" : "Assigned",
    dueDateLabel: formatOptionalDateLabel(task.dueAt),
    id: task.id,
    title: task.title,
    updatedAtLabel: formatDateLabel(task.updatedAt),
  }));
}

function readLatestTaskUpdateLabel(tasks: TaskSummary[]): string {
  const latestUpdate = tasks.reduce<string | null>(
    (currentLatest, task) =>
      currentLatest === null ? task.updatedAt : maxIsoTimestamp(currentLatest, task.updatedAt),
    null,
  );

  return latestUpdate === null ? "Unknown" : formatDateLabel(latestUpdate);
}

function compareTaskPosition(firstTask: TaskSummary, secondTask: TaskSummary): number {
  const positionComparison = firstTask.position.localeCompare(secondTask.position, "en", {
    numeric: true,
  });

  if (positionComparison !== 0) {
    return positionComparison;
  }

  return firstTask.updatedAt.localeCompare(secondTask.updatedAt);
}

function compareStatusPosition(
  firstStatus: WorkspaceStatus,
  secondStatus: WorkspaceStatus,
): number {
  return firstStatus.position.localeCompare(secondStatus.position, "en", { numeric: true });
}

function formatDateLabel(value: string): string {
  return value.slice(0, 10);
}

function formatOptionalDateLabel(value: string | null | undefined): string {
  return hasDateValue(value) ? formatDateLabel(value) : "No due date";
}

function maxIsoTimestamp(currentValue: string, candidateValue: string): string {
  return Date.parse(candidateValue) > Date.parse(currentValue) ? candidateValue : currentValue;
}

function readParentTaskLabel(task: TaskSummary, tasks: TaskSummary[]): string {
  if (task.parentTaskId === null || task.parentTaskId === undefined) {
    return "Parent task";
  }

  return tasks.find((candidate) => candidate.id === task.parentTaskId)?.title ?? "Subtask";
}

function hasDateValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined;
}

function hasParentTaskValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined;
}

function hasStatusValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined;
}

function hasTextValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim().length > 0;
}

function isTaskUnassigned(task: TaskSummary): boolean {
  return task.assigneeUserId === null || task.assigneeUserId === undefined;
}
