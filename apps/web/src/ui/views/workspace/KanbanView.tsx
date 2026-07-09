import type { ReactElement } from "react";
import { buildKanbanColumns, buildKanbanSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary, WorkspaceStatus } from "./types.js";

export type KanbanViewProps = {
  projects: ProjectSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
};

export function KanbanView({ projects, statuses, tasks }: KanbanViewProps): ReactElement {
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
