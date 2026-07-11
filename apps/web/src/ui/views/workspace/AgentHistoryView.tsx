import {
  Badge,
  Button,
  Callout,
  Card,
  DataList,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
} from "@radix-ui/themes";
import type { AgentRunDetail, TaskApiClient } from "@task/api-client";
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
    <Grid columns="1">
      <Card aria-labelledby="agent-history-view-title">
        <Flex gap="4">
          <Flex gap="1">
            <Text color="gray">Agent</Text>
            <Heading id="agent-history-view-title">Agent run audit</Heading>
          </Flex>
          <TextField.Root
            aria-label="Filter agent runs"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Filter by prompt, source, status, or response"
            value={query}
          />
          {rows.length === 0 ? (
            <article>
              <Flex align="start" gap="4" justify="between">
                <Flex gap="1">
                  <Heading as="h3">No agent runs match this view</Heading>
                  <Text color="gray">{summary.selectedWorkspaceLabel}</Text>
                </Flex>
                <Badge>{summary.selectedProjectLabel}</Badge>
              </Flex>
            </article>
          ) : (
            rows.map((run) => (
              <article key={run.id}>
                <Flex align="start" gap="4" justify="between">
                  <Flex gap="1">
                    <Button
                      aria-pressed={run.id === selectedRunId}
                      onClick={() => setSelectedRunId(run.id)}
                      variant="ghost"
                    >
                      {run.title}
                    </Button>
                    <Text color="gray">{run.detail}</Text>
                  </Flex>
                  <Badge>
                    {run.statusLabel} - {run.updatedAtLabel}
                  </Badge>
                </Flex>
              </article>
            ))
          )}
        </Flex>
      </Card>

      <Card aria-labelledby="agent-run-detail-title">
        <Flex gap="4">
          <Flex gap="1">
            <Text color="gray">Run detail</Text>
            <Heading id="agent-run-detail-title">Selected agent run</Heading>
          </Flex>
          {detailState.status === "empty" ? (
            <Text color="gray">Select a run to inspect its safe audit record.</Text>
          ) : null}
          {detailState.status === "loading" ? (
            <Text color="gray">Loading agent-run details…</Text>
          ) : null}
          {detailState.status === "error" ? (
            <Callout.Root color="red">{detailState.message}</Callout.Root>
          ) : null}
          {detailState.status === "loaded" ? (
            <AgentRunDetailPanel
              detail={detailState.detail}
              onOpenConfirmations={onOpenConfirmations}
            />
          ) : null}
        </Flex>
      </Card>

      <Card aria-labelledby="agent-history-summary-title">
        <Flex gap="4">
          <Flex gap="1">
            <Text color="gray">Summary</Text>
            <Heading id="agent-history-summary-title">Audit load</Heading>
          </Flex>
          <Text color="gray">{summary.selectedWorkspaceLabel}</Text>
          <DataList.Root>
            {[
              ["Runs", summary.runCount],
              ["Projects", summary.projectCount],
              ["Tasks", summary.taskCount],
              ["Skills", summary.skillCount],
              ["Statuses", summary.statusCount],
            ].map(([label, value]) => (
              <DataList.Item key={label}>
                <DataList.Label>{label}</DataList.Label>
                <DataList.Value>{value}</DataList.Value>
              </DataList.Item>
            ))}
          </DataList.Root>
        </Flex>
      </Card>
    </Grid>
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
    <Flex gap="4">
      <Flex gap="2">
        <Text>Status: {detail.status}</Text>
        <Text>Source: {detail.source}</Text>
        <Text>Model: {detail.model ?? "Not recorded"}</Text>
        <AuditValue label="TextField" value={detail.inputText} />
        <AuditValue label="Response" value={detail.finalResponse ?? "Not recorded"} />
        {detail.error === null || detail.error === undefined ? null : (
          <AuditValue label="Error" value={detail.error} />
        )}
      </Flex>

      <Flex gap="2">
        <Heading as="h3">Tool-call audit</Heading>
        {detail.toolCalls.length === 0 ? (
          <Text color="gray">No tool calls were recorded for this run.</Text>
        ) : (
          detail.toolCalls.map((toolCall) => (
            <Flex gap="1" key={toolCall.id}>
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
            </Flex>
          ))
        )}
      </Flex>

      <Flex gap="2">
        <Heading as="h3">Confirmation requests</Heading>
        {detail.confirmationRequests.length === 0 ? (
          <Text color="gray">This run did not create confirmation requests.</Text>
        ) : (
          <Flex gap="2">
            {detail.confirmationRequests.map((confirmation) => (
              <Flex align="start" gap="2" justify="between" key={confirmation.id}>
                <Flex gap="1">
                  <Text>
                    {confirmation.kind} · {confirmation.status}
                  </Text>
                  <AuditValue label="Preview" value={formatAuditJson(confirmation.preview)} />
                </Flex>
                <Button onClick={onOpenConfirmations} variant="soft">
                  Open confirmations <ExternalLink aria-hidden="true" />
                </Button>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

function AuditValue({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Card>
      <Text color="gray">{label}</Text>
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
