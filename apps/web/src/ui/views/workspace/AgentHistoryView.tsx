import {
  MAlert,
  MBox,
  MButton,
  MFlex,
  MHeading,
  MInput,
  MOperationalContentGrid,
  MText,
} from "@task/ui/app";
import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  buildAgentHistoryRows,
  buildAgentHistorySummary,
  filterAgentHistoryRows,
} from "../workspaceViewModels.js";
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
  const [query, setQuery] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(agentRuns[0]?.id ?? null);
  const rows = filterAgentHistoryRows(agentRuns, query);
  const allRows = buildAgentHistoryRows(agentRuns);
  const selectedRun = allRows.find((run) => run.id === selectedRunId) ?? null;
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

  useEffect(() => {
    if (selectedRunId !== null && agentRuns.some((run) => run.id === selectedRunId)) {
      return;
    }

    setSelectedRunId(agentRuns[0]?.id ?? null);
  }, [agentRuns, selectedRunId]);

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Agent" title="Agent run audit" titleId="agent-history-view-title">
        <MFlex align="stretch" direction="column" gap="m">
          <MInput
            aria-label="Filter agent runs"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Filter by prompt, source, status, or response"
            value={query}
          />
          {rows.length === 0 ? (
            <MFlex as="article" align="start" gap="m" justify="space-between" wrap="nowrap">
              <MBox>
                <MHeading mode="h4">No agent runs match this view</MHeading>
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
                  <MButton
                    aria-pressed={run.id === selectedRunId}
                    mode="transparent"
                    noPadding
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    {run.title}
                  </MButton>
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

      <WorkspacePanel
        eyebrow="Run detail"
        title="Selected agent run"
        titleId="agent-run-detail-title"
      >
        {selectedRun === null ? (
          <MText as="p" mode="secondary">
            Select a run to inspect the data included in its summary.
          </MText>
        ) : (
          <MFlex align="stretch" direction="column" gap="s">
            <MText as="p">Status: {selectedRun.statusLabel}</MText>
            <MText as="p">Source: {selectedRun.detail}</MText>
            <MText as="p">Model: {selectedRun.model ?? "Not recorded"}</MText>
            <MText as="p">Prompt: {selectedRun.title}</MText>
            <MText as="p">Response: {selectedRun.finalResponse ?? "Not recorded"}</MText>
            {selectedRun.error === null ? null : <MText as="p">Error: {selectedRun.error}</MText>}
          </MFlex>
        )}
        <MAlert mode="info">
          <MText as="p">
            The current contract supplies run summaries only; it has no agent-run detail or
            tool-call endpoint. This panel shows the complete safe detail available without
            inventing an unsupported request.
          </MText>
        </MAlert>
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
