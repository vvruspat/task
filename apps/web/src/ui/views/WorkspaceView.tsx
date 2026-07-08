import type { components } from "@task/api-client";
import type { ComponentType, ReactElement, SVGProps } from "react";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type WorkspaceViewProps = {
  projects: ProjectSummary[];
  route: {
    id: string;
    label: string;
    description: string;
    icon: IconComponent;
  };
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
};

export default function WorkspaceView({
  projects,
  route,
  skills,
  statuses,
  tasks,
}: WorkspaceViewProps): ReactElement {
  const visibleRows = route.id === "templates" ? skills.length : tasks.length;

  if (route.id === "kanban") {
    return <KanbanView projects={projects} statuses={statuses} tasks={tasks} />;
  }

  if (route.id === "matrix") {
    return <MatrixView tasks={tasks} />;
  }

  if (route.id === "projects") {
    return <ProjectsView projects={projects} tasks={tasks} />;
  }

  if (route.id === "table") {
    return <TaskTableView projects={projects} tasks={tasks} />;
  }

  if (route.id === "templates") {
    return <TemplatesView skills={skills} />;
  }

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="workspace-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Lazy view</p>
            <h3 id="workspace-view-title">{route.label}</h3>
          </div>
          <route.icon aria-hidden="true" className="muted-icon" />
        </div>

        <div className="view-surface">
          <div className="table-header">
            <span>Name</span>
            <span>Project</span>
            <span>Status</span>
            <span>Owner</span>
          </div>
          {tasks.map((task) => (
            <article className="table-row" key={task.id}>
              <span>{task.title}</span>
              <span>
                {projects.find((project) => project.id === task.projectId)?.title ??
                  "Unknown project"}
              </span>
              <span>Open</span>
              <span>{task.assigneeUserId === null ? "Unassigned" : "Assigned"}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="view-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="view-summary-title">Ready for data</h3>
          </div>
        </div>
        <p className="agent-line">{route.description}</p>
        <dl className="metric-list">
          <div>
            <dt>Rows</dt>
            <dd>{visibleRows}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{projects.length}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{skills.length}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
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

export type ProjectOverviewSummary = {
  dueSoonTaskCount: number;
  projectCount: number;
  taskCount: number;
  unassignedTaskCount: number;
};

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

function KanbanView({
  projects,
  statuses,
  tasks,
}: {
  projects: ProjectSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
}): ReactElement {
  const columns = buildKanbanColumns(projects, statuses, tasks);
  const summary = buildKanbanSummary(statuses, tasks);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="kanban-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Kanban</p>
            <h3 id="kanban-view-title">Status board</h3>
          </div>
        </div>

        <div className="kanban-board">
          {columns.map((column) => (
            <section
              className="kanban-column"
              key={column.id}
              aria-labelledby={`${column.id}-title`}
            >
              <div className="kanban-column-header">
                <span style={{ backgroundColor: column.color }} aria-hidden="true" />
                <h4 id={`${column.id}-title`}>{column.name}</h4>
                <strong>{column.taskCount}</strong>
              </div>
              <div className="kanban-card-list">
                {column.tasks.map((task) => (
                  <article className="kanban-card" key={task.id}>
                    <h5>{task.title}</h5>
                    <p>{task.projectTitle}</p>
                    <div>
                      <span>{task.assigneeLabel}</span>
                      <span>{task.dueDateLabel}</span>
                      <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="kanban-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="kanban-summary-title">Board load</h3>
          </div>
        </div>
        <p className="agent-line">Columns use workspace statuses loaded by the web shell.</p>
        <dl className="metric-list">
          <div>
            <dt>Columns</dt>
            <dd>{summary.columnCount}</dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Done</dt>
            <dd>{summary.doneTaskCount}</dd>
          </div>
          <div>
            <dt>Unset</dt>
            <dd>{summary.unsetTaskCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function MatrixView({ tasks }: { tasks: TaskSummary[] }): ReactElement {
  const columns = buildMatrixColumns(tasks);
  const summary = buildMatrixSummary(tasks);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="matrix-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Matrix</p>
            <h3 id="matrix-view-title">Parent task grid</h3>
          </div>
        </div>

        <div className="matrix-grid">
          {columns.map((column) => (
            <section
              className="matrix-column"
              key={column.id}
              aria-labelledby={`${column.id}-title`}
            >
              <div className="matrix-column-header">
                <h4 id={`${column.id}-title`}>{column.title}</h4>
                <span>{column.childCount} subtasks</span>
                <time dateTime={column.updatedAtLabel}>{column.updatedAtLabel}</time>
              </div>
              <div className="matrix-cell-list">
                {column.cells.map((cell) => (
                  <article className="matrix-cell" key={cell.id}>
                    <h5>{cell.title}</h5>
                    <div>
                      <span>{cell.assigneeLabel}</span>
                      <span>{cell.dueDateLabel}</span>
                      <time dateTime={cell.updatedAtLabel}>{cell.updatedAtLabel}</time>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="matrix-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="matrix-summary-title">Task tree</h3>
          </div>
        </div>
        <p className="agent-line">
          Columns use parent and subtask relationships from loaded tasks.
        </p>
        <dl className="metric-list">
          <div>
            <dt>Parents</dt>
            <dd>{summary.parentTaskCount}</dd>
          </div>
          <div>
            <dt>Subtasks</dt>
            <dd>{summary.subtaskCount}</dd>
          </div>
          <div>
            <dt>Due</dt>
            <dd>{summary.dueTaskCount}</dd>
          </div>
          <div>
            <dt>Unassigned</dt>
            <dd>{summary.unassignedTaskCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ProjectsView({
  projects,
  tasks,
}: {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
}): ReactElement {
  const rows = buildProjectOverviewRows(projects, tasks);
  const summary = buildProjectOverviewSummary(projects, tasks);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="projects-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Projects</p>
            <h3 id="projects-view-title">Workspace projects</h3>
          </div>
        </div>

        <div className="project-overview-list">
          {rows.map((project) => (
            <article className="project-overview-row" key={project.id}>
              <div>
                <h4>{project.title}</h4>
                <p>{project.description}</p>
              </div>
              <dl>
                <div className="project-overview-metric">
                  <dt>Tasks</dt>
                  <dd>{project.taskCount}</dd>
                </div>
                <div className="project-overview-metric">
                  <dt>Due soon</dt>
                  <dd>{project.dueSoonTaskCount}</dd>
                </div>
                <div className="project-overview-metric">
                  <dt>Unassigned</dt>
                  <dd>{project.unassignedTaskCount}</dd>
                </div>
                <div className="project-overview-metric">
                  <dt>Updated</dt>
                  <dd>{project.latestActivityLabel}</dd>
                </div>
              </dl>
              <span>{project.statusLabel}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="projects-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="projects-summary-title">Project load</h3>
          </div>
        </div>
        <p className="agent-line">
          Counts use the tasks currently loaded for the selected workspace project.
        </p>
        <dl className="metric-list">
          <div>
            <dt>Projects</dt>
            <dd>{summary.projectCount}</dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Unassigned</dt>
            <dd>{summary.unassignedTaskCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function TaskTableView({
  projects,
  tasks,
}: {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
}): ReactElement {
  const rows = buildTaskTableRows(projects, tasks);
  const summary = buildTaskTableSummary(tasks);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="task-table-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Table</p>
            <h3 id="task-table-view-title">Task table</h3>
          </div>
        </div>

        <div className="view-surface">
          <div className="task-table-header">
            <span>Task</span>
            <span>Project</span>
            <span>Parent</span>
            <span>Assignee</span>
            <span>Due</span>
            <span>Updated</span>
          </div>
          {rows.map((task) => (
            <article className="task-table-row" key={task.id}>
              <span>{task.title}</span>
              <span>{task.projectTitle}</span>
              <span>{task.parentLabel}</span>
              <span>{task.assigneeLabel}</span>
              <span>{task.dueDateLabel}</span>
              <span>{task.updatedAtLabel}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="task-table-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="task-table-summary-title">Loaded tasks</h3>
          </div>
        </div>
        <p className="agent-line">Counts use the task set currently loaded by the web shell.</p>
        <dl className="metric-list">
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Due soon</dt>
            <dd>{summary.dueSoonTaskCount}</dd>
          </div>
          <div>
            <dt>Unassigned</dt>
            <dd>{summary.unassignedTaskCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function TemplatesView({ skills }: { skills: TaskSkillSummary[] }): ReactElement {
  const rows = buildTemplateSkillRows(skills);
  const summary = buildTemplateSkillSummary(skills);

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="templates-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Templates</p>
            <h3 id="templates-view-title">Task skills</h3>
          </div>
        </div>

        <div className="template-skill-list">
          {rows.map((skill) => (
            <article className="template-skill-row" key={skill.id}>
              <div>
                <h4>{skill.name}</h4>
                <p>{skill.description}</p>
              </div>
              <span>{skill.aliasLabel}</span>
              <time dateTime={skill.updatedAtLabel}>{skill.updatedAtLabel}</time>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="templates-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="templates-summary-title">Loaded skills</h3>
          </div>
        </div>
        <p className="agent-line">Read-only overview of task skills loaded for the workspace.</p>
        <dl className="metric-list">
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
          <div>
            <dt>Aliases</dt>
            <dd>{summary.skillsWithAliasesCount}</dd>
          </div>
          <div>
            <dt>No description</dt>
            <dd>{summary.skillsWithoutDescriptionCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
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

function hasTextValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && value.trim().length > 0;
}

function hasStatusValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined;
}

function hasParentTaskValue(value: string | null | undefined): value is string {
  return value !== null && value !== undefined;
}

function isTaskUnassigned(task: TaskSummary): boolean {
  return task.assigneeUserId === null || task.assigneeUserId === undefined;
}
