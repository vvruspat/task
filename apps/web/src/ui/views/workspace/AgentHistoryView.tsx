import { MBox, MFlex, MHeading, MOperationalContentGrid, MText } from "@task/ui/app";
import type { ReactElement } from "react";
import { buildAgentHistoryRows, buildAgentHistorySummary } from "../workspaceViewModels.js";
import type {
  AgentRunSummary,
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

export type AgentHistoryViewProps = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export function AgentHistoryView({
  agentRuns,
  projects,
  selectedProjectId,
  selectedWorkspaceId,
  skills,
  statuses,
  tasks,
  workspaces,
}: AgentHistoryViewProps): ReactElement {
  const rows = buildAgentHistoryRows(agentRuns);
  const summary = buildAgentHistorySummary({
    agentRuns,
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  });

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Agent" title="Agent run audit" titleId="agent-history-view-title">
        <MFlex align="stretch" direction="column" gap="m">
          {rows.length === 0 ? (
            <MFlex as="article" align="start" gap="m" justify="space-between" wrap="nowrap">
              <MBox>
                <MHeading mode="h4">No agent runs loaded</MHeading>
                <MText as="p" mode="secondary">
                  {summary.selectedWorkspaceLabel}
                </MText>
              </MBox>
              <MText as="span">{summary.selectedProjectLabel}</MText>
            </MFlex>
          ) : (
            rows.map((run) => (
              <MFlex
                as="article"
                align="start"
                gap="m"
                key={run.id}
                justify="space-between"
                wrap="nowrap"
              >
                <MBox>
                  <MHeading mode="h4">{run.title}</MHeading>
                  <MText as="p" mode="secondary">
                    {run.detail}
                  </MText>
                </MBox>
                <MText as="span">
                  {run.statusLabel} - {run.updatedAtLabel}
                </MText>
              </MFlex>
            ))
          )}
        </MFlex>
      </WorkspacePanel>

      <WorkspacePanel eyebrow="Summary" title="Audit load" titleId="agent-history-summary-title">
        <MText as="p" mode="secondary">
          {summary.selectedWorkspaceLabel}
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Runs", value: summary.runCount },
            { label: "Projects", value: summary.projectCount },
            { label: "Tasks", value: summary.taskCount },
            { label: "Skills", value: summary.skillCount },
            { label: "Statuses", value: summary.statusCount },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}
