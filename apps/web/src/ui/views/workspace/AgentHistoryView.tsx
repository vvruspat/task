import type { AgentRunDetail, TaskApiClient } from "@task/api-client";
import {
  Alert,
  Badge,
  Button,
  Card,
  ContentGrid,
  DescriptionList,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from "@task/ui";
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
    <ContentGrid columns={1}>
      <Card aria-labelledby="agent-history-view-title">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text tone="muted">Agent</Text>
            <Heading id="agent-history-view-title">Agent run audit</Heading>
          </Stack>
          <Input
            aria-label="Filter agent runs"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Filter by prompt, source, status, or response"
            value={query}
          />
          {rows.length === 0 ? (
            <article>
              <Flex align="start" gap="lg" justify="between">
                <Stack gap="xs">
                  <Heading level={3}>No agent runs match this view</Heading>
                  <Text tone="muted">{summary.selectedWorkspaceLabel}</Text>
                </Stack>
                <Badge>{summary.selectedProjectLabel}</Badge>
              </Flex>
            </article>
          ) : (
            rows.map((run) => (
              <article key={run.id}>
                <Flex align="start" gap="lg" justify="between">
                  <Stack gap="xs">
                    <Button
                      aria-pressed={run.id === selectedRunId}
                      onClick={() => setSelectedRunId(run.id)}
                      variant="ghost"
                    >
                      {run.title}
                    </Button>
                    <Text tone="muted">{run.detail}</Text>
                  </Stack>
                  <Badge>
                    {run.statusLabel} - {run.updatedAtLabel}
                  </Badge>
                </Flex>
              </article>
            ))
          )}
        </Stack>
      </Card>

      <Card aria-labelledby="agent-run-detail-title">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text tone="muted">Run detail</Text>
            <Heading id="agent-run-detail-title">Selected agent run</Heading>
          </Stack>
          {detailState.status === "empty" ? (
            <Text tone="muted">Select a run to inspect its safe audit record.</Text>
          ) : null}
          {detailState.status === "loading" ? (
            <Text tone="muted">Loading agent-run details…</Text>
          ) : null}
          {detailState.status === "error" ? (
            <Alert tone="danger">{detailState.message}</Alert>
          ) : null}
          {detailState.status === "loaded" ? (
            <AgentRunDetailPanel
              detail={detailState.detail}
              onOpenConfirmations={onOpenConfirmations}
            />
          ) : null}
        </Stack>
      </Card>

      <Card aria-labelledby="agent-history-summary-title">
        <Stack gap="lg">
          <Stack gap="xs">
            <Text tone="muted">Summary</Text>
            <Heading id="agent-history-summary-title">Audit load</Heading>
          </Stack>
          <Text tone="muted">{summary.selectedWorkspaceLabel}</Text>
          <DescriptionList
            items={[
              { label: "Runs", value: summary.runCount },
              { label: "Projects", value: summary.projectCount },
              { label: "Tasks", value: summary.taskCount },
              { label: "Skills", value: summary.skillCount },
              { label: "Statuses", value: summary.statusCount },
            ]}
          />
        </Stack>
      </Card>
    </ContentGrid>
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
    <Stack gap="lg">
      <Stack gap="sm">
        <Text>Status: {detail.status}</Text>
        <Text>Source: {detail.source}</Text>
        <Text>Model: {detail.model ?? "Not recorded"}</Text>
        <AuditValue label="Input" value={detail.inputText} />
        <AuditValue label="Response" value={detail.finalResponse ?? "Not recorded"} />
        {detail.error === null || detail.error === undefined ? null : (
          <AuditValue label="Error" value={detail.error} />
        )}
      </Stack>

      <Stack gap="sm">
        <Heading level={3}>Tool-call audit</Heading>
        {detail.toolCalls.length === 0 ? (
          <Text tone="muted">No tool calls were recorded for this run.</Text>
        ) : (
          detail.toolCalls.map((toolCall) => (
            <Stack gap="xs" key={toolCall.id}>
              <Text>
                {toolCall.toolName} · {toolCall.status}
              </Text>
              <AuditValue label="Arguments" value={formatAuditJson(toolCall.arguments)} />
              {toolCall.result === null || toolCall.result === undefined ? null : (
                <AuditValue label="Result" value={formatAuditJson(toolCall.result)} />
              )}
              {toolCall.error === null || toolCall.error === undefined ? null : (
                <AuditValue label="Error" value={toolCall.error} />
              )}
            </Stack>
          ))
        )}
      </Stack>

      <Stack gap="sm">
        <Heading level={3}>Confirmation requests</Heading>
        {detail.confirmationRequests.length === 0 ? (
          <Text tone="muted">This run did not create confirmation requests.</Text>
        ) : (
          <Stack gap="sm">
            {detail.confirmationRequests.map((confirmation) => (
              <Flex align="start" gap="sm" justify="between" key={confirmation.id}>
                <Stack gap="xs">
                  <Text>
                    {confirmation.kind} · {confirmation.status}
                  </Text>
                  <AuditValue label="Preview" value={formatAuditJson(confirmation.preview)} />
                </Stack>
                <Button onClick={onOpenConfirmations} variant="secondary">
                  Open confirmations <ExternalLink aria-hidden="true" />
                </Button>
              </Flex>
            ))}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

function AuditValue({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Card>
      <Text tone="muted">{label}</Text>
      <pre>{value}</pre>
    </Card>
  );
}

function formatAuditJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load agent-run details.";
}
