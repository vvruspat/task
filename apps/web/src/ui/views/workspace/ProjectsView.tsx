import type { ReactElement } from "react";
import { buildProjectOverviewRows, buildProjectOverviewSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary } from "./types.js";

export type ProjectsViewProps = {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
};

export function ProjectsView({ projects, tasks }: ProjectsViewProps): ReactElement {
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
