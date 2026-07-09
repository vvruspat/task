import type { MDataGridHeaderType, MDataGridRowType } from "@task/ui/app";
import { MDataGrid, MOperationalContentGrid, MText } from "@task/ui/app";
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
  const headers: MDataGridHeaderType[] = [
    { field: "title", label: "Task", sortable: true },
    { field: "projectTitle", label: "Project", sortable: true },
    { field: "parentLabel", label: "Parent", sortable: true },
    { field: "assigneeLabel", label: "Assignee", sortable: true },
    { field: "dueDateLabel", label: "Due", sortable: true },
    { field: "updatedAtLabel", label: "Updated", sortable: true },
  ];
  const gridRows: MDataGridRowType[] = rows.map((task) => ({
    id: task.id,
    title: task.title,
    projectTitle: task.projectTitle,
    parentLabel: task.parentLabel,
    assigneeLabel: task.assigneeLabel,
    dueDateLabel: task.dueDateLabel,
    updatedAtLabel: task.updatedAtLabel,
  }));

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Table" title="Task table" titleId="task-table-view-title">
        <MDataGrid
          aria-labelledby="task-table-view-title"
          emptyMessage="No tasks loaded"
          headers={headers}
          rows={gridRows}
        />
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded tasks" titleId="task-table-summary-title">
        <MText as="p" mode="secondary">
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
    </MOperationalContentGrid>
  );
}
