import type { ReactElement } from "react";
import { buildTaskTableRows, buildTaskTableSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary } from "./types.js";

export type TaskTableViewProps = {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
};

export function TaskTableView({ projects, tasks }: TaskTableViewProps): ReactElement {
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
