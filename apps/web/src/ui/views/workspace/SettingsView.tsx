import { MBox, MFlex, MGrid, MHeading, MText } from "@task/ui";
import type { ReactElement } from "react";
import { buildSettingsSummary, buildSettingsWorkspaceRows } from "../workspaceViewModels.js";
import type {
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type SettingsViewProps = {
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export function SettingsView({
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: SettingsViewProps): ReactElement {
  const rows = buildSettingsWorkspaceRows(workspaces);
  const summary = buildSettingsSummary({
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });

  return (
    <MGrid
      className="content-grid"
      columnTemplate="minmax(0, 1.4fr) minmax(280px, 0.6fr)"
      rowGap="m"
      columnGap="m"
    >
      <WorkspacePanel
        eyebrow="Settings"
        title="Workspace context"
        titleId="settings-view-title"
        wide
      >
        <MBox className="settings-workspace-list">
          {rows.map((workspace) => (
            <MFlex
              as="article"
              className="settings-workspace-row"
              key={workspace.id}
              justify="space-between"
              wrap="nowrap"
            >
              <MBox>
                <MHeading mode="h4">{workspace.name}</MHeading>
                <MText as="p" mode="secondary">
                  {workspace.slug}
                </MText>
              </MBox>
              <time dateTime={workspace.updatedAtLabel}>{workspace.updatedAtLabel}</time>
            </MFlex>
          ))}
        </MBox>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Loaded context" titleId="settings-summary-title">
        <MText as="p" className="agent-line" mode="secondary">
          {summary.selectedWorkspaceLabel}
        </MText>
        <MText as="p" className="agent-line" mode="secondary">
          {summary.selectedProjectLabel}
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Workspaces", value: summary.workspaceCount },
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Statuses", value: summary.statusCount },
            { label: "Skills", value: summary.skillCount },
          ]}
        />
      </WorkspacePanel>
    </MGrid>
  );
}
