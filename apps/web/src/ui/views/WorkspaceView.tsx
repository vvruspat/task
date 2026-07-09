import type { components } from "@task/api-client";
import type { ComponentType, ReactElement, SVGProps } from "react";
import {
  buildAgentHistoryRows,
  buildAgentHistorySummary,
  buildKanbanColumns,
  buildKanbanSummary,
  buildMatrixColumns,
  buildMatrixSummary,
  buildProjectOverviewRows,
  buildProjectOverviewSummary,
  buildSettingsSummary,
  buildSettingsWorkspaceRows,
  buildTaskTableRows,
  buildTaskTableSummary,
  buildTemplateSkillRows,
  buildTemplateSkillSummary,
} from "./workspaceViewModels.js";

type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];
type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type WorkspaceViewProps = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  route: {
    id: string;
    label: string;
    description: string;
    icon: IconComponent;
  };
  skills: TaskSkillSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export default function WorkspaceView({
  agentRuns,
  projects,
  route,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
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

  if (route.id === "agent") {
    return (
      <AgentHistoryView
        agentRuns={agentRuns}
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedWorkspaceId={selectedWorkspaceId}
        skills={skills}
        statuses={statuses}
        tasks={tasks}
        workspaces={workspaces}
      />
    );
  }

  if (route.id === "settings") {
    return (
      <SettingsView
        projects={projects}
        selectedProjectId={selectedProjectId}
        selectedWorkspaceId={selectedWorkspaceId}
        skills={skills}
        statuses={statuses}
        tasks={tasks}
        workspaces={workspaces}
      />
    );
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

function AgentHistoryView({
  agentRuns,
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
}): ReactElement {
  const rows = buildAgentHistoryRows(agentRuns);
  const summary = buildAgentHistorySummary({
    agentRuns,
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="agent-history-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Agent</p>
            <h3 id="agent-history-view-title">Agent run audit</h3>
          </div>
        </div>

        <div className="agent-history-list">
          {rows.length === 0 ? (
            <article className="agent-history-row">
              <div>
                <h4>No agent runs loaded</h4>
                <p>{summary.selectedWorkspaceLabel}</p>
              </div>
              <span>{summary.selectedProjectLabel}</span>
            </article>
          ) : (
            rows.map((run) => (
              <article className="agent-history-row" key={run.id}>
                <div>
                  <h4>{run.title}</h4>
                  <p>{run.detail}</p>
                </div>
                <span>
                  {run.statusLabel} - {run.updatedAtLabel}
                </span>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="agent-history-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="agent-history-summary-title">Audit load</h3>
          </div>
        </div>
        <p className="agent-line">{summary.selectedWorkspaceLabel}</p>
        <dl className="metric-list">
          <div>
            <dt>Runs</dt>
            <dd>{summary.runCount}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{summary.projectCount}</dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
          <div>
            <dt>Statuses</dt>
            <dd>{summary.statusCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function SettingsView({
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
}): ReactElement {
  const rows = buildSettingsWorkspaceRows(workspaces);
  const summary = buildSettingsSummary({
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });

  return (
    <div className="content-grid">
      <section className="panel wide-panel" aria-labelledby="settings-view-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h3 id="settings-view-title">Workspace context</h3>
          </div>
        </div>

        <div className="settings-workspace-list">
          {rows.map((workspace) => (
            <article className="settings-workspace-row" key={workspace.id}>
              <div>
                <h4>{workspace.name}</h4>
                <p>{workspace.slug}</p>
              </div>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="settings-summary-title">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Summary</p>
            <h3 id="settings-summary-title">Loaded context</h3>
          </div>
        </div>
        <p className="agent-line">{summary.selectedWorkspaceLabel}</p>
        <p className="agent-line">{summary.selectedProjectLabel}</p>
        <dl className="metric-list">
          <div>
            <dt>Workspaces</dt>
            <dd>{summary.workspaceCount}</dd>
          </div>
          <div>
            <dt>Projects</dt>
            <dd>{summary.projectCount}</dd>
          </div>
          <div>
            <dt>Tasks</dt>
            <dd>{summary.taskCount}</dd>
          </div>
          <div>
            <dt>Statuses</dt>
            <dd>{summary.statusCount}</dd>
          </div>
          <div>
            <dt>Skills</dt>
            <dd>{summary.skillCount}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
