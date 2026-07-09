import { MBox, MGrid, MHeading, MText } from "@task/ui";
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
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel eyebrow="Kanban" title="Status board" titleId="kanban-view-title" wide>
        <MBox className="kanban-board">
          {columns.map((column) => (
            <MBox
              as="section"
              className="kanban-column"
              key={column.id}
              aria-labelledby={`${column.id}-title`}
            >
              <MBox className="kanban-column-header">
                <MBox as="span" style={{ backgroundColor: column.color }} aria-hidden="true" />
                <MHeading id={`${column.id}-title`} mode="h4">
                  {column.name}
                </MHeading>
                <strong>{column.taskCount}</strong>
              </MBox>
              <MBox className="kanban-card-list">
                {column.tasks.map((task) => (
                  <MBox as="article" className="kanban-card" key={task.id}>
                    <MHeading mode="h5">{task.title}</MHeading>
                    <MText as="p" mode="secondary">
                      {task.projectTitle}
                    </MText>
                    <MBox>
                      <MText as="span">{task.assigneeLabel}</MText>
                      <MText as="span">{task.dueDateLabel}</MText>
                      <time dateTime={task.updatedAtLabel}>{task.updatedAtLabel}</time>
                    </MBox>
                  </MBox>
                ))}
              </MBox>
            </MBox>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Board load" titleId="kanban-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
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
    </MGrid>
  );
}
