import type { ReactElement } from "react";
import { buildMatrixColumns, buildMatrixSummary } from "../workspaceViewModels.js";
import type { TaskSummary } from "./types.js";

export type MatrixViewProps = {
  tasks: TaskSummary[];
};

export function MatrixView({ tasks }: MatrixViewProps): ReactElement {
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
