import {
  MFlex,
  MHeading,
  MOperationalBoardCard,
  MOperationalBoardColumn,
  MOperationalContentGrid,
  MOperationalLane,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { buildMatrixColumns, buildMatrixSummary } from "../workspaceViewModels.js";
import type { TaskSummary } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type MatrixViewProps = {
  onOpenTask(taskId: string): void;
  tasks: TaskSummary[];
};

export function MatrixView({ onOpenTask, tasks }: MatrixViewProps): ReactElement {
  const columns = buildMatrixColumns(tasks);
  const summary = buildMatrixSummary(tasks);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Matrix" title="Parent task grid" titleId="matrix-view-title">
        <MOperationalLane>
          {columns.map((column) => (
            <MOperationalBoardColumn key={column.id} aria-labelledby={`${column.id}-title`}>
              <MFlex align="start" direction="column" gap="xs">
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.title}
                </MHeading>
                <MText as="span" mode="secondary">
                  {column.childCount} subtasks
                </MText>
                <time dateTime={column.updatedAtLabel}>{column.updatedAtLabel}</time>
              </MFlex>
              <MFlex align="stretch" direction="column" gap="s">
                {column.cells.map((cell) => (
                  <MOperationalBoardCard
                    key={cell.id}
                    onClick={() => onOpenTask(cell.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenTask(cell.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <MHeading mode="h5">{cell.title}</MHeading>
                    <MFlex gap="xs">
                      <MText as="span">{cell.assigneeLabel}</MText>
                      <MText as="span">{cell.dueDateLabel}</MText>
                      <time dateTime={cell.updatedAtLabel}>{cell.updatedAtLabel}</time>
                    </MFlex>
                  </MOperationalBoardCard>
                ))}
              </MFlex>
            </MOperationalBoardColumn>
          ))}
        </MOperationalLane>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Task tree" titleId="matrix-summary-title">
        <MText as="p" mode="secondary">
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
    </MOperationalContentGrid>
  );
}
