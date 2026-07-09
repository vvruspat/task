import type { MDataGridHeaderType, MDataGridRowType } from "@task/ui/app";
import { MDataGrid, MOperationalContentGrid, MText } from "@task/ui/app";
import type { ReactElement } from "react";
import type { ProjectSummary, TaskSkillSummary, TaskSummary, WorkspaceRoute } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type FallbackWorkspaceRouteViewProps = {
  projects: ProjectSummary[];
  route: WorkspaceRoute;
  skills: TaskSkillSummary[];
  tasks: TaskSummary[];
};

export function FallbackWorkspaceRouteView({
  projects,
  route,
  skills,
  tasks,
}: FallbackWorkspaceRouteViewProps): ReactElement {
  const visibleRows = route.id === "templates" ? skills.length : tasks.length;
  const headers: MDataGridHeaderType[] = [
    { field: "title", label: "Name", sortable: true },
    { field: "projectTitle", label: "Project", sortable: true },
    { field: "statusLabel", label: "Status", sortable: true },
    { field: "ownerLabel", label: "Owner", sortable: true },
  ];
  const gridRows: MDataGridRowType[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    projectTitle:
      projects.find((project) => project.id === task.projectId)?.title ?? "Unknown project",
    statusLabel: "Open",
    ownerLabel: task.assigneeUserId === null ? "Unassigned" : "Assigned",
  }));

  return (
    <MOperationalContentGrid>
      <WorkspacePanel
        action={<route.icon aria-hidden="true" />}
        eyebrow="Lazy view"
        title={route.label}
        titleId="workspace-view-title"
      >
        <MDataGrid
          aria-labelledby="workspace-view-title"
          emptyMessage="No rows loaded"
          headers={headers}
          rows={gridRows}
        />
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Ready for data" titleId="view-summary-title">
        <MText as="p" mode="secondary">
          {route.description}
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Rows", value: visibleRows },
            { label: "Projects", value: projects.length },
            { label: "Skills", value: skills.length },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}
