import type { components } from "@task/api-client";
import type { ComponentType, ReactElement, SVGProps } from "react";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];

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
  tasks: TaskSummary[];
};

export default function WorkspaceView({
  projects,
  route,
  skills,
  tasks,
}: WorkspaceViewProps): ReactElement {
  const visibleRows = route.id === "templates" ? skills.length : tasks.length;

  if (route.id === "projects") {
    return <ProjectsView projects={projects} tasks={tasks} />;
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

export type ProjectOverviewSummary = {
  dueSoonTaskCount: number;
  projectCount: number;
  taskCount: number;
  unassignedTaskCount: number;
};

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
      unassignedTaskCount: projectTasks.filter((task) => task.assigneeUserId === null).length,
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
    unassignedTaskCount: tasks.filter((task) => task.assigneeUserId === null).length,
  };
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

function countDueSoonTasks(tasks: TaskSummary[]): number {
  return tasks.filter((task) => task.dueAt !== null).length;
}

function formatDateLabel(value: string): string {
  return value.slice(0, 10);
}

function maxIsoTimestamp(currentValue: string, candidateValue: string): string {
  return Date.parse(candidateValue) > Date.parse(currentValue) ? candidateValue : currentValue;
}
