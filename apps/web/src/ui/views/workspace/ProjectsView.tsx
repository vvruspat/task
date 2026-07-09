import { MBadge, MBox, MFlex, MHeading, MOperationalContentGrid, MText } from "@task/ui/app";
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
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Projects" title="Workspace projects" titleId="projects-view-title">
        <MFlex align="stretch" direction="column" gap="m">
          {rows.map((project) => (
            <MFlex
              as="article"
              align="start"
              gap="m"
              justify="space-between"
              key={project.id}
              wrap="nowrap"
            >
              <MBox>
                <MHeading mode="h4">{project.title}</MHeading>
                <MText as="p" mode="secondary">
                  {project.description}
                </MText>
              </MBox>
              <WorkspaceMetrics
                items={[
                  { label: "Tasks", value: project.taskCount },
                  { label: "Due soon", value: project.dueSoonTaskCount },
                  { label: "Unassigned", value: project.unassignedTaskCount },
                  { label: "Updated", value: project.latestActivityLabel },
                ]}
              />
              <MBadge mode="transparent">{project.statusLabel}</MBadge>
            </MFlex>
          ))}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Project load" titleId="projects-summary-title">
        <MText as="p" mode="secondary">
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
    </MOperationalContentGrid>
  );
}
