import { MBox, MGrid, MText } from "@task/ui";
import type { ReactElement } from "react";
import { buildTaskTableRows, buildTaskTableSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type TaskTableViewProps = {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
};

export function TaskTableView({ projects, tasks }: TaskTableViewProps): ReactElement {
  const rows = buildTaskTableRows(projects, tasks);
  const summary = buildTaskTableSummary(tasks);

  return (
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel eyebrow="Table" title="Task table" titleId="task-table-view-title" wide>
        <MBox className="view-surface">
          <MBox className="task-table-header">
            <MText as="span">Task</MText>
            <MText as="span">Project</MText>
            <MText as="span">Parent</MText>
            <MText as="span">Assignee</MText>
            <MText as="span">Due</MText>
            <MText as="span">Updated</MText>
          </MBox>
          {rows.map((task) => (
            <MBox as="article" className="task-table-row" key={task.id}>
              <MText as="span">{task.title}</MText>
              <MText as="span">{task.projectTitle}</MText>
              <MText as="span">{task.parentLabel}</MText>
              <MText as="span">{task.assigneeLabel}</MText>
              <MText as="span">{task.dueDateLabel}</MText>
              <MText as="span">{task.updatedAtLabel}</MText>
            </MBox>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded tasks" titleId="task-table-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
          Counts use the task set currently loaded by the web shell.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Tasks", value: summary.taskCount },
            { label: "Due soon", value: summary.dueSoonTaskCount },
            { label: "Unassigned", value: summary.unassignedTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MGrid>
  );
}
