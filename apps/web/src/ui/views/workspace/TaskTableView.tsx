import type { TaskApiClient, TaskSummary, WorkspaceStatus } from "@task/api-client";
import type { DataTableColumn, RadixSelectOption } from "@task/ui/app";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ContentGrid,
  DataTable,
  DescriptionList,
  Flex,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  Toolbar,
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
        if (activeRequestRef.current === requestId) {
          setLoadState({ message: readError(error), status: "error" });
        }
      });
  }, [client, projectId, query, workspaceId]);

  const statusOptions: readonly RadixSelectOption[] = useMemo(
    () => [
      { label: "All statuses", value: "all" },
      { label: "Unassigned status", value: unassigned },
      ...statuses.map((status) => ({ label: status.name, value: status.id })),
    ],
    [statuses],
  );
  const bulkStatusOptions: readonly RadixSelectOption[] = useMemo(
    () => [{ label: "No status change", value: noBulkChange }, ...statusOptions.slice(1)],
    [statusOptions],
  );
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
  const toggleTaskSelection = (taskId: string, checked: boolean): void => {
    setSelectedTaskIds((currentIds) =>
      checked
        ? currentIds.includes(taskId)
          ? currentIds
          : [...currentIds, taskId]
        : currentIds.filter((id) => id !== taskId),
    );
  };
  const togglePageSelection = (checked: boolean): void => {
    setSelectedTaskIds(checked ? rows.map((row) => row.id) : []);
  };
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
  const columns: readonly DataTableColumn<TaskTableRow>[] = [
    {
      cell: (row) => (
        <Checkbox
          aria-label={`Select ${row.title}`}
          checked={selectedIdSet.has(row.id)}
          onCheckedChange={(checked) => toggleTaskSelection(row.id, checked === true)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
      header: (
        <Checkbox
          aria-label="Select all tasks on this page"
          checked={rows.length > 0 && rows.every((row) => selectedIdSet.has(row.id))}
          onCheckedChange={(checked) => togglePageSelection(checked === true)}
        />
      ),
      id: "select",
      width: "3rem",
    },
    {
      cell: (row) => row.title,
      header: sortButton("Task", "title", query, changeQuery),
      id: "title",
    },
    {
      cell: (row) => row.status,
      header: sortButton("Status", "status", query, changeQuery),
      id: "status",
    },
    {
      cell: (row) => row.assigneeLabel,
      header: sortButton("Assignee", "assignee", query, changeQuery),
      id: "assignee",
    },
    {
      cell: (row) => row.dueDateLabel,
      header: sortButton("Due", "dueAt", query, changeQuery),
      id: "dueAt",
    },
    {
      cell: (row) => row.updatedAtLabel,
      header: sortButton("Updated", "updatedAt", query, changeQuery),
      id: "updatedAt",
    },
  ];

  if (projectId === null) return <TableNotice message="Choose a project to view its task table." />;
  if (workspaceId === null || client === null)
    return <TableNotice message="Loading the task table…" />;

  return (
    <ContentGrid>
      <Card aria-labelledby="task-table-view-title">
        <Stack>
          <Stack gap="xs">
            <Text tone="muted">Table</Text>
            <Heading id="task-table-view-title">Task table</Heading>
          </Stack>
          <Toolbar>
            <Input
              aria-label="Search tasks"
              placeholder="Search tasks"
              value={query.search}
              onChange={(event) => changeQuery({ page: 1, search: event.target.value })}
            />
            <Select
              aria-label="Filter by status"
              options={statusOptions}
              value={query.status === "" ? "all" : query.status}
              onValueChange={(value) =>
                changeQuery({ page: 1, status: value === "all" ? "" : value })
              }
            />
            <Input
              aria-label="Filter by assignee ID"
              placeholder="Assignee ID or unassigned"
              value={query.assignee}
              onChange={(event) => changeQuery({ assignee: event.target.value, page: 1 })}
            />
            <Input
              aria-label="Due from"
              type="date"
              value={query.dueFrom}
              onChange={(event) => changeQuery({ dueFrom: event.target.value, page: 1 })}
            />
            <Input
              aria-label="Due to"
              type="date"
              value={query.dueTo}
              onChange={(event) => changeQuery({ dueTo: event.target.value, page: 1 })}
            />
          </Toolbar>
          {bulkError === null ? null : (
            <Alert tone="danger">
              <Flex align="center" justify="between">
                <Text>{bulkError}</Text>
                <Button disabled={!canApplyBulk || isBulkUpdating} onClick={applyBulk}>
                  Retry bulk update
                </Button>
              </Flex>
            </Alert>
          )}
          {selectedTaskIds.length === 0 ? null : (
            <Toolbar>
              <Text>{selectedTaskIds.length} selected</Text>
              <Select
                aria-label="Bulk status"
                options={bulkStatusOptions}
                value={bulkStatus === "" ? noBulkChange : bulkStatus}
                onValueChange={(value) => setBulkStatus(value === noBulkChange ? "" : value)}
              />
              <Input
                aria-label="Bulk assignee ID"
                placeholder="Assignee ID; use unassigned to clear"
                value={bulkAssignee}
                onChange={(event) => setBulkAssignee(event.target.value)}
              />
              <Input
                aria-label="Bulk due date"
                type="date"
                value={bulkDueAt === clearDueDate ? "" : bulkDueAt}
                onChange={(event) => setBulkDueAt(event.target.value)}
              />
              <Button variant="secondary" onClick={() => setBulkDueAt(clearDueDate)}>
                Clear due date
              </Button>
              <Button disabled={!canApplyBulk || isBulkUpdating} onClick={applyBulk}>
                {isBulkUpdating ? "Updating…" : "Apply updates"}
              </Button>
            </Toolbar>
          )}
          {loadState.status === "error" ? (
            <Alert tone="danger">
              <Flex align="center" justify="between">
                <Text>{loadState.message}</Text>
                <Button onClick={() => changeQuery({ ...query })}>Retry</Button>
              </Flex>
            </Alert>
          ) : null}
          <DataTable
            aria-labelledby="task-table-view-title"
            columns={columns}
            emptyState={
              loadState.status === "loading" ? "Loading tasks…" : "No tasks match these filters"
            }
            getRowId={(row) => row.id}
            onRowClick={(row) => onOpenTask(row.id)}
            rows={rows}
            selectedRowIds={selectedIdSet}
          />
          <Toolbar density="compact">
            <Button
              disabled={query.page <= 1}
              variant="secondary"
              onClick={() => changeQuery({ page: query.page - 1 })}
            >
              Previous
            </Button>
            <Text>
              Page {query.page} of {pageCount}
            </Text>
            <Button
              disabled={query.page >= pageCount}
              variant="secondary"
              onClick={() => changeQuery({ page: query.page + 1 })}
            >
              Next
            </Button>
            <Select
              aria-label="Rows per page"
              options={[
                { label: "10 rows", value: "10" },
                { label: "25 rows", value: "25" },
                { label: "50 rows", value: "50" },
              ]}
              value={String(query.pageSize)}
              onValueChange={(value) => changeQuery({ page: 1, pageSize: parsePageSize(value) })}
            />
          </Toolbar>
        </Stack>
      </Card>
      <Card aria-labelledby="task-table-summary-title">
        <Stack>
          <Stack gap="xs">
            <Text tone="muted">Summary</Text>
            <Heading id="task-table-summary-title">Results</Heading>
          </Stack>
          <Text tone="muted">Filters, sorting, and pagination are applied by the server.</Text>
          <DescriptionList
            items={[
              {
                label: "Total tasks",
                value: loadState.status === "loaded" ? loadState.total : "—",
              },
              { label: "Page", value: query.page },
              { label: "Page size", value: query.pageSize },
            ]}
          />
        </Stack>
      </Card>
    </ContentGrid>
  );
}

function TableNotice({ message }: { message: string }): ReactElement {
  return (
    <Card aria-labelledby="task-table-view-title">
      <Stack>
        <Text tone="muted">Table</Text>
        <Heading id="task-table-view-title">Task table</Heading>
        <Text>{message}</Text>
      </Stack>
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
      size="sm"
      variant="ghost"
      onClick={() => changeQuery({ page: 1, sortBy, sortDirection: nextDirection })}
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
