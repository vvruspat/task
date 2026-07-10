import type { AgentRunDetail, TaskApiClient } from "@task/api-client";
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
import { ExternalLink } from "lucide-react";
import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { buildAgentHistorySummary, filterAgentHistoryRows } from "../workspaceViewModels.js";
import type {
  AgentRunSummary,
  ProjectSummary,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

type AgentRunDetailClient = Pick<TaskApiClient, "getAgentRun">;

type AgentRunDetailState =
  | { status: "empty" }
  | { status: "loading" }
  | { detail: AgentRunDetail; status: "loaded" }
  | { message: string; status: "error" };

export type AgentHistoryViewProps = {
  agentRuns: AgentRunSummary[];
  client: AgentRunDetailClient | null;
  onOpenConfirmations(): void;
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
  client,
  onOpenConfirmations,
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
  const [detailState, setDetailState] = useState<AgentRunDetailState>({ status: "empty" });
  const detailRequestId = useRef(0);
  const rows = filterAgentHistoryRows(agentRuns, query);
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

  useEffect(() => {
    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;

    if (selectedRunId === null) {
      setDetailState({ status: "empty" });
      return;
    }

    if (selectedWorkspaceId === null || client === null) {
      setDetailState({
        message: "Agent-run details are unavailable until the workspace API is connected.",
        status: "error",
      });
      return;
    }

    let disposed = false;
    setDetailState({ status: "loading" });
    void client
      .getAgentRun({ agentRunId: selectedRunId, workspaceId: selectedWorkspaceId })
      .then((detail) => {
        if (!disposed && detailRequestId.current === requestId) {
          setDetailState({ detail, status: "loaded" });
        }
      })
      .catch((error: unknown) => {
        if (!disposed && detailRequestId.current === requestId) {
          setDetailState({ message: readError(error), status: "error" });
        }
      });

    return () => {
      disposed = true;
    };
  }, [client, selectedRunId, selectedWorkspaceId]);

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
        {detailState.status === "empty" ? (
          <MText as="p" mode="secondary">
            Select a run to inspect its safe audit record.
          </MText>
        ) : null}
        {detailState.status === "loading" ? (
          <MText as="p" mode="secondary">
            Loading agent-run details…
          </MText>
        ) : null}
        {detailState.status === "error" ? (
          <MAlert mode="error">
            <MText as="p">{detailState.message}</MText>
          </MAlert>
        ) : null}
        {detailState.status === "loaded" ? (
          <AgentRunDetailPanel
            detail={detailState.detail}
            onOpenConfirmations={onOpenConfirmations}
          />
        ) : null}
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

function AgentRunDetailPanel({
  detail,
  onOpenConfirmations,
}: {
  detail: AgentRunDetail;
  onOpenConfirmations(): void;
}): ReactElement {
  return (
    <MFlex align="stretch" direction="column" gap="m">
      <MFlex align="stretch" direction="column" gap="s">
        <MText as="p">Status: {detail.status}</MText>
        <MText as="p">Source: {detail.source}</MText>
        <MText as="p">Model: {detail.model ?? "Not recorded"}</MText>
        <AuditValue label="Input" value={detail.inputText} />
        <AuditValue label="Response" value={detail.finalResponse ?? "Not recorded"} />
        {detail.error === null || detail.error === undefined ? null : (
          <AuditValue label="Error" value={detail.error} />
        )}
      </MFlex>

      <MBox>
        <MHeading mode="h4">Tool-call audit</MHeading>
        {detail.toolCalls.length === 0 ? (
          <MText as="p" mode="secondary">
            No tool calls were recorded for this run.
          </MText>
        ) : (
          detail.toolCalls.map((toolCall) => (
            <MFlex align="stretch" direction="column" gap="xs" key={toolCall.id}>
              <MText as="p">
                {toolCall.toolName} · {toolCall.status}
              </MText>
              <AuditValue label="Arguments" value={formatAuditJson(toolCall.arguments)} />
              {toolCall.result === null || toolCall.result === undefined ? null : (
                <AuditValue label="Result" value={formatAuditJson(toolCall.result)} />
              )}
              {toolCall.error === null || toolCall.error === undefined ? null : (
                <AuditValue label="Error" value={toolCall.error} />
              )}
            </MFlex>
          ))
        )}
      </MBox>

      <MBox>
        <MHeading mode="h4">Confirmation requests</MHeading>
        {detail.confirmationRequests.length === 0 ? (
          <MText as="p" mode="secondary">
            This run did not create confirmation requests.
          </MText>
        ) : (
          <MFlex align="stretch" direction="column" gap="s">
            {detail.confirmationRequests.map((confirmation) => (
              <MFlex
                align="start"
                gap="s"
                justify="space-between"
                key={confirmation.id}
                wrap="nowrap"
              >
                <MBox>
                  <MText as="p">
                    {confirmation.kind} · {confirmation.status}
                  </MText>
                  <AuditValue label="Preview" value={formatAuditJson(confirmation.preview)} />
                </MBox>
                <MButton onClick={onOpenConfirmations}>
                  Open confirmations <ExternalLink aria-hidden="true" />
                </MButton>
              </MFlex>
            ))}
          </MFlex>
        )}
      </MBox>
    </MFlex>
  );
}

function AuditValue({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <MBox as="pre" padding="s">
      <MText as="div" mode="secondary">
        {label}
      </MText>
      <MText as="div">{value}</MText>
    </MBox>
  );
}

function formatAuditJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load agent-run details.";
}
