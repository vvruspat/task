import {
  MFlex,
  MHeading,
  MOperationalBoardCard,
  MOperationalBoardColumn,
  MOperationalContentGrid,
  MOperationalLane,
  MOperationalStatusDot,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { buildKanbanColumns, buildKanbanSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary, WorkspaceStatus } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type KanbanViewProps = {
  projects: ProjectSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
};

export function KanbanView({ projects, statuses, tasks }: KanbanViewProps): ReactElement {
  const columns = buildKanbanColumns(projects, statuses, tasks);
  const summary = buildKanbanSummary(statuses, tasks);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Kanban" title="Status board" titleId="kanban-view-title">
        <MOperationalLane>
          {columns.map((column) => (
            <MOperationalBoardColumn key={column.id} aria-labelledby={`${column.id}-title`}>
              <MFlex justify="space-between" wrap="nowrap">
                <MOperationalStatusDot color={column.color} aria-hidden="true" />
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.name}
                </MHeading>
                <strong>{column.taskCount}</strong>
              </MFlex>
              <MFlex align="stretch" direction="column" gap="s">
                {column.tasks.map((task) => (
                  <MOperationalBoardCard key={task.id}>
                    <MHeading mode="h5">{task.title}</MHeading>
                    <MText as="p" mode="secondary">
                      {task.projectTitle}
                    </MText>
                    <MFlex gap="xs">
                      <MText as="span">{task.assigneeLabel}</MText>
                      <MText as="span">{task.dueDateLabel}</MText>
                      <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
                    </MFlex>
                  </MOperationalBoardCard>
                ))}
              </MFlex>
            </MOperationalBoardColumn>
          ))}
        </MOperationalLane>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Board load" titleId="kanban-summary-title">
        <MText as="p" mode="secondary">
          Columns use workspace statuses loaded by the web shell.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Columns", value: summary.columnCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Done", value: summary.doneTaskCount },
            { label: "Unset", value: summary.unsetTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}
