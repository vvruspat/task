import { MBox, MGrid, MText } from "@task/ui";
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

  return (
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel
        action={<route.icon aria-hidden="true" className="muted-icon" />}
        eyebrow="Lazy view"
        title={route.label}
        titleId="workspace-view-title"
        wide
      >
        <MBox className="view-surface">
          <MBox className="table-header">
            <MText as="span">Name</MText>
            <MText as="span">Project</MText>
            <MText as="span">Status</MText>
            <MText as="span">Owner</MText>
          </MBox>
          {tasks.map((task) => (
            <MBox as="article" className="table-row" key={task.id}>
              <MText as="span">{task.title}</MText>
              <MText as="span">
                {projects.find((project) => project.id === task.projectId)?.title ??
                  "Unknown project"}
              </MText>
              <MText as="span">Open</MText>
              <MText as="span">{task.assigneeUserId === null ? "Unassigned" : "Assigned"}</MText>
            </MBox>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Ready for data" titleId="view-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
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
    </MGrid>
  );
}
