import { MBox, MGrid, MHeading, MText } from "@task/ui";
import type { ReactElement } from "react";
import { buildMatrixColumns, buildMatrixSummary } from "../workspaceViewModels.js";
import type { TaskSummary } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type MatrixViewProps = {
  tasks: TaskSummary[];
};

export function MatrixView({ tasks }: MatrixViewProps): ReactElement {
  const columns = buildMatrixColumns(tasks);
  const summary = buildMatrixSummary(tasks);

  return (
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel eyebrow="Matrix" title="Parent task grid" titleId="matrix-view-title" wide>
        <MBox className="matrix-grid">
          {columns.map((column) => (
            <MBox
              as="section"
              className="matrix-column"
              key={column.id}
              aria-labelledby={`${column.id}-title`}
            >
              <MBox className="matrix-column-header">
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.title}
                </MHeading>
                <MText as="span" mode="secondary">
                  {column.childCount} subtasks
                </MText>
                <time dateTime={column.updatedAtLabel}>{column.updatedAtLabel}</time>
              </MBox>
              <MBox className="matrix-cell-list">
                {column.cells.map((cell) => (
                  <MBox as="article" className="matrix-cell" key={cell.id}>
                    <MHeading mode="h5">{cell.title}</MHeading>
                    <MBox>
                      <MText as="span">{cell.assigneeLabel}</MText>
                      <MText as="span">{cell.dueDateLabel}</MText>
                      <time dateTime={cell.updatedAtLabel}>{cell.updatedAtLabel}</time>
                    </MBox>
                  </MBox>
                ))}
              </MBox>
            </MBox>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Task tree" titleId="matrix-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
          Columns use parent and subtask relationships from loaded tasks.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Parents", value: summary.parentTaskCount },
            { label: "Subtasks", value: summary.subtaskCount },
            { label: "Due", value: summary.dueTaskCount },
            { label: "Unassigned", value: summary.unassignedTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MGrid>
  );
}
