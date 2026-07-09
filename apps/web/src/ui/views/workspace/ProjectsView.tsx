import { MBadge, MBox, MGrid, MHeading, MText } from "@task/ui";
import type { ReactElement } from "react";
import { buildProjectOverviewRows, buildProjectOverviewSummary } from "../workspaceViewModels.js";
import type { ProjectSummary, TaskSummary } from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type ProjectsViewProps = {
  projects: ProjectSummary[];
  tasks: TaskSummary[];
};

export function ProjectsView({ projects, tasks }: ProjectsViewProps): ReactElement {
  const rows = buildProjectOverviewRows(projects, tasks);
  const summary = buildProjectOverviewSummary(projects, tasks);

  return (
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel
        eyebrow="Projects"
        title="Workspace projects"
        titleId="projects-view-title"
        wide
      >
        <MBox className="project-overview-list">
          {rows.map((project) => (
            <MBox as="article" className="project-overview-row" key={project.id}>
              <MBox>
                <MHeading mode="h4">{project.title}</MHeading>
                <MText as="p" mode="secondary">
                  {project.description}
                </MText>
              </MBox>
              <WorkspaceMetrics
                className="project-overview-metrics"
                items={[
                  { label: "Tasks", value: project.taskCount },
                  { label: "Due soon", value: project.dueSoonTaskCount },
                  { label: "Unassigned", value: project.unassignedTaskCount },
                  { label: "Updated", value: project.latestActivityLabel },
                ]}
              />
              <MBadge className="project-status-badge" mode="transparent">
                {project.statusLabel}
              </MBadge>
            </MBox>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Project load" titleId="projects-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
          Counts use the tasks currently loaded for the selected workspace project.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Unassigned", value: summary.unassignedTaskCount },
          ]}
        />
      </WorkspacePanel>
    </MGrid>
  );
}
