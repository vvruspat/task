import type { TaskApiClient, TaskSummary, WorkspaceStatus } from "@task/api-client";
import {
  Button,
  Callout,
  Card,
  Checkbox,
  Flex,
  Heading,
  Select,
  Table,
  Text,
  TextField,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTaskTableBulkBody,
  createTaskTableRequest,
  parseTaskTableQuery,
  type TaskTableQuery,
  taskTableClearDueDate,
  taskTableUnassigned,
} from "./taskTableViewModels.js";

export type TaskTableViewProps = {
  client: TaskApiClient | null;
  onOpenTask(taskId: string): void;
  projectId: string | null;
  statuses: WorkspaceStatus[];
  workspaceId: string | null;
};
type LoadState =
  | { status: "loading" }
  | { items: TaskSummary[]; revision: number; total: number; status: "loaded" }
  | { message: string; status: "error" };
type TaskTableRow = {
  assigneeLabel: string;
  dueDateLabel: string;
  id: string;
  status: string;
  title: string;
  updatedAtLabel: string;
};
const unassigned = taskTableUnassigned;
const noBulkChange = "no-change";
const clearDueDate = taskTableClearDueDate;

export function TaskTableView({
  client,
  onOpenTask,
  projectId,
  statuses,
  workspaceId,
}: TaskTableViewProps): ReactElement {
  const [query, setQuery] = useState<TaskTableQuery>(() =>
    parseTaskTableQuery(window.location.search),
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkDueAt, setBulkDueAt] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const activeRequestRef = useRef(0);
  const loadRevisionRef = useRef(0);
  useEffect(() => {
    const onPopState = (): void => setQuery(parseTaskTableQuery(window.location.search));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (client === null || projectId === null || workspaceId === null) {
      setLoadState({ status: "loading" });
      return;
    }
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setLoadState({ status: "loading" });
    setSelectedTaskIds([]);
    void client
      .listTaskTable(createTaskTableRequest(query, projectId, workspaceId))
      .then((page) => {
        if (activeRequestRef.current === requestId) {
          loadRevisionRef.current += 1;
          setLoadState({
            items: page.items,
            revision: loadRevisionRef.current,
            status: "loaded",
            total: page.total,
          });
        }
      })
      .catch((error: unknown) => {
        if (activeRequestRef.current === requestId)
          setLoadState({ message: readError(error), status: "error" });
      });
  }, [client, projectId, query, workspaceId]);
  const rows = loadState.status === "loaded" ? toTableRows(loadState.items, statuses) : [];
  const selectedIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds]);
  const canApplyBulk =
    selectedTaskIds.length > 0 && hasBulkChange(bulkStatus, bulkAssignee, bulkDueAt);
  const pageCount =
    loadState.status === "loaded" ? Math.max(1, Math.ceil(loadState.total / query.pageSize)) : 1;
  const changeQuery = (patch: Partial<TaskTableQuery>): void => {
    const nextQuery = { ...query, ...patch };
    writeTableQuery(nextQuery);
    setQuery(nextQuery);
  };
  const toggleTaskSelection = (taskId: string, checked: boolean): void =>
    setSelectedTaskIds((currentIds) =>
      checked
        ? currentIds.includes(taskId)
          ? currentIds
          : [...currentIds, taskId]
        : currentIds.filter((id) => id !== taskId),
    );
  const applyBulk = (): void => {
    if (!canApplyBulk || client === null || projectId === null || workspaceId === null) return;
    const body = createTaskTableBulkBody(selectedTaskIds, bulkStatus, bulkAssignee, bulkDueAt);
    setBulkError(null);
    setIsBulkUpdating(true);
    void client
      .bulkUpdateTasks({ body, projectId, workspaceId })
      .then(() => {
        setSelectedTaskIds([]);
        setBulkStatus("");
        setBulkAssignee("");
        setBulkDueAt("");
        changeQuery({ page: 1 });
      })
      .catch((error: unknown) => setBulkError(readError(error)))
      .finally(() => setIsBulkUpdating(false));
  };
  if (projectId === null) return <TableNotice message="Choose a project to view its task table." />;
  if (workspaceId === null || client === null)
    return <TableNotice message="Loading the task table…" />;
  const statusOptions = [
    { label: "All statuses", value: "all" },
    { label: "Unassigned status", value: unassigned },
    ...statuses.map((status) => ({ label: status.name, value: status.id })),
  ];
  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Text color="gray" size="2">
              Table
            </Text>
            <Heading size="6">Task table</Heading>
          </Flex>
          <Flex gap="2" wrap="wrap">
            <TextField.Root
              aria-label="Search tasks"
              placeholder="Search tasks"
              value={query.search}
              onChange={(event) => changeQuery({ page: 1, search: event.target.value })}
            />
            <Select.Root
              value={query.status === "" ? "all" : query.status}
              onValueChange={(value) =>
                changeQuery({ page: 1, status: value === "all" ? "" : value })
              }
            >
              <Select.Trigger aria-label="Filter by status" />{" "}
              <Select.Content>
                {statusOptions.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <TextField.Root
              aria-label="Filter by assignee ID"
              placeholder="Assignee ID or unassigned"
              value={query.assignee}
              onChange={(event) => changeQuery({ assignee: event.target.value, page: 1 })}
            />
            <TextField.Root
              aria-label="Due from"
              type="date"
              value={query.dueFrom}
              onChange={(event) => changeQuery({ dueFrom: event.target.value, page: 1 })}
            />
            <TextField.Root
              aria-label="Due to"
              type="date"
              value={query.dueTo}
              onChange={(event) => changeQuery({ dueTo: event.target.value, page: 1 })}
            />
          </Flex>
          {bulkError === null ? null : (
            <Callout.Root color="red">
              <Callout.Text>{bulkError}</Callout.Text>
              <Button disabled={!canApplyBulk || isBulkUpdating} onClick={applyBulk}>
                Retry bulk update
              </Button>
            </Callout.Root>
          )}
          {selectedTaskIds.length === 0 ? null : (
            <Flex gap="2" wrap="wrap">
              <Text>{selectedTaskIds.length} selected</Text>
              <Select.Root
                value={bulkStatus === "" ? noBulkChange : bulkStatus}
                onValueChange={(value) => setBulkStatus(value === noBulkChange ? "" : value)}
              >
                <Select.Trigger aria-label="Bulk status" />
                <Select.Content>
                  {[
                    { label: "No status change", value: noBulkChange },
                    ...statusOptions.slice(1),
                  ].map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <TextField.Root
                aria-label="Bulk assignee ID"
                placeholder="Assignee ID; use unassigned to clear"
                value={bulkAssignee}
                onChange={(event) => setBulkAssignee(event.target.value)}
              />
              <TextField.Root
                aria-label="Bulk due date"
                type="date"
                value={bulkDueAt === clearDueDate ? "" : bulkDueAt}
                onChange={(event) => setBulkDueAt(event.target.value)}
              />
              <Button variant="surface" onClick={() => setBulkDueAt(clearDueDate)}>
                Clear due date
              </Button>
              <Button disabled={!canApplyBulk || isBulkUpdating} onClick={applyBulk}>
                {isBulkUpdating ? "Updating…" : "Apply updates"}
              </Button>
            </Flex>
          )}
          {loadState.status === "error" ? (
            <Callout.Root color="red">
              <Callout.Text>{loadState.message}</Callout.Text>
              <Button onClick={() => changeQuery({ ...query })}>Retry</Button>
            </Callout.Root>
          ) : null}
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>
                  <Checkbox
                    aria-label="Select all tasks on this page"
                    checked={rows.length > 0 && rows.every((row) => selectedIdSet.has(row.id))}
                    onCheckedChange={(checked) =>
                      setSelectedTaskIds(checked === true ? rows.map((row) => row.id) : [])
                    }
                  />
                </Table.ColumnHeaderCell>
                {(
                  [
                    ["Task", "title"],
                    ["Status", "status"],
                    ["Assignee", "assignee"],
                    ["Due", "dueAt"],
                    ["Updated", "updatedAt"],
                  ] as const
                ).map(([label, sortBy]) => (
                  <Table.ColumnHeaderCell key={sortBy}>
                    {sortButton(label, sortBy, query, changeQuery)}
                  </Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {loadState.status === "loading" ? (
                <Table.Row>
                  <Table.Cell colSpan={6}>Loading tasks…</Table.Cell>
                </Table.Row>
              ) : rows.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={6}>No tasks match these filters</Table.Cell>
                </Table.Row>
              ) : (
                rows.map((row) => (
                  <Table.Row key={row.id} onClick={() => onOpenTask(row.id)}>
                    <Table.Cell>
                      <Checkbox
                        aria-label={`Select ${row.title}`}
                        checked={selectedIdSet.has(row.id)}
                        onCheckedChange={(checked) => toggleTaskSelection(row.id, checked === true)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </Table.Cell>
                    <Table.Cell>{row.title}</Table.Cell>
                    <Table.Cell>{row.status}</Table.Cell>
                    <Table.Cell>{row.assigneeLabel}</Table.Cell>
                    <Table.Cell>{row.dueDateLabel}</Table.Cell>
                    <Table.Cell>{row.updatedAtLabel}</Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table.Root>
          <Flex align="center" gap="2">
            <Button
              disabled={query.page <= 1}
              variant="surface"
              onClick={() => changeQuery({ page: query.page - 1 })}
            >
              Previous
            </Button>
            <Text>
              Page {query.page} of {pageCount}
            </Text>
            <Button
              disabled={query.page >= pageCount}
              variant="surface"
              onClick={() => changeQuery({ page: query.page + 1 })}
            >
              Next
            </Button>
            <Select.Root
              value={String(query.pageSize)}
              onValueChange={(value) => changeQuery({ page: 1, pageSize: parsePageSize(value) })}
            >
              <Select.Trigger aria-label="Rows per page" />
              <Select.Content>
                {[10, 25, 50].map((value) => (
                  <Select.Item key={value} value={String(value)}>
                    {value} rows
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
      </Card>
      <Card>
        <Text color="gray">Filters, sorting, and pagination are applied by the server.</Text>
        <Text>
          Total tasks: {loadState.status === "loaded" ? loadState.total : "—"} · Page: {query.page}{" "}
          · Page size: {query.pageSize}
        </Text>
      </Card>
    </Flex>
  );
}
function TableNotice({ message }: { message: string }): ReactElement {
  return (
    <Card>
      <Flex direction="column" gap="2">
        <Text color="gray">Table</Text>
        <Heading size="6">Task table</Heading>
        <Text>{message}</Text>
      </Flex>
    </Card>
  );
}
function sortButton(
  label: string,
  sortBy: TaskTableQuery["sortBy"],
  query: TaskTableQuery,
  changeQuery: (patch: Partial<TaskTableQuery>) => void,
): ReactElement {
  const isCurrent = query.sortBy === sortBy;
  const nextDirection = isCurrent && query.sortDirection === "asc" ? "desc" : "asc";
  const directionLabel = isCurrent ? (query.sortDirection === "asc" ? " ↑" : " ↓") : "";
  return (
    <Button
      aria-label={`Sort by ${label}${isCurrent ? `, currently ${query.sortDirection}` : ""}`}
      onClick={() => changeQuery({ page: 1, sortBy, sortDirection: nextDirection })}
      size="1"
      variant="ghost"
    >
      {label}
      {directionLabel}
    </Button>
  );
}
function writeTableQuery(query: TaskTableQuery): void {
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, string> = {
    tableAssignee: query.assignee,
    tableDueFrom: query.dueFrom,
    tableDueTo: query.dueTo,
    tableSearch: query.search,
    tableStatus: query.status,
  };
  for (const [key, value] of Object.entries(values))
    value.length === 0 ? params.delete(key) : params.set(key, value);
  params.set("tablePage", String(query.page));
  params.set("tablePageSize", String(query.pageSize));
  params.set("tableSortBy", query.sortBy);
  params.set("tableSortDirection", query.sortDirection);
  window.history.pushState(
    null,
    "",
    `${window.location.pathname}?${params.toString()}${window.location.hash}`,
  );
}
function toTableRows(items: TaskSummary[], statuses: WorkspaceStatus[]): TaskTableRow[] {
  return items.map((task) => ({
    assigneeLabel: task.assigneeUserId ?? "Unassigned",
    dueDateLabel:
      task.dueAt === undefined || task.dueAt === null
        ? "—"
        : new Date(task.dueAt).toLocaleDateString(),
    id: task.id,
    status:
      statuses.find((status) => status.id === task.statusId)?.name ?? task.statusId ?? "Unassigned",
    title: task.title,
    updatedAtLabel:
      task.updatedAt === undefined ? "—" : new Date(task.updatedAt).toLocaleDateString(),
  }));
}
function hasBulkChange(status: string, assignee: string, dueAt: string): boolean {
  return status.length > 0 || assignee.trim().length > 0 || dueAt.length > 0;
}
function parsePageSize(value: string): 10 | 25 | 50 {
  return value === "10" ? 10 : value === "50" ? 50 : 25;
}
function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The task table request failed.";
}
