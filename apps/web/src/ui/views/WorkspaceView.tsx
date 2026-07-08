import type { components } from "@task/api-client";
import type { ComponentType, ReactElement, SVGProps } from "react";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type WorkspaceViewProps = {
  projects: ProjectSummary[];
  route: {
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
  const visibleRows = route.label === "Templates" ? skills.length : tasks.length;

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
