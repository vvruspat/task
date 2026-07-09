import type { TaskApiClient, TaskSummary, WorkspaceStatus } from "@task/api-client";
import type { MDataGridHeaderType, MDataGridRowType, MSelectOption } from "@task/ui/app";
import {
  MAlert,
  MButton,
  MDataGrid,
  MFlex,
  MInput,
  MOperationalContentGrid,
  MSelect,
  MText,
} from "@task/ui/app";
import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createTaskTableBulkBody,
  createTaskTableGridKey,
  createTaskTableRequest,
  parseTaskTableQuery,
  type TaskTableQuery,
  taskTableClearDueDate,
  taskTableUnassigned,
} from "./taskTableViewModels.js";
import { WorkspaceMetrics, WorkspacePanel } from "./WorkspacePrimitives.js";

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
  const [selectedRows, setSelectedRows] = useState<MDataGridRowType[]>([]);
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
    setSelectedRows([]);
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

  const statusOptions: MSelectOption[] = useMemo(
    () => [
      { key: "all", value: "All statuses" },
      { key: unassigned, value: "Unassigned status" },
      ...statuses.map((status) => ({ key: status.id, value: status.name })),
    ],
    [statuses],
  );
  const bulkStatusOptions: MSelectOption[] = useMemo(
    () => [{ key: noBulkChange, value: "No status change" }, ...statusOptions.slice(1)],
    [statusOptions],
  );
  const rows = loadState.status === "loaded" ? toGridRows(loadState.items, statuses) : [];
  const gridKey = createTaskTableGridKey(
    query,
    projectId,
    loadState.status === "loaded" ? loadState.revision : loadRevisionRef.current,
    workspaceId,
  );
  const selectedTaskIds = selectedRows.map((row) => String(row.id));
  const canApplyBulk =
    selectedTaskIds.length > 0 && hasBulkChange(bulkStatus, bulkAssignee, bulkDueAt);
  const headers: MDataGridHeaderType[] = [
    {
      field: "title",
      label: "Task",
      renderCell: (value, row) =>
        typeof value === "string" ? (
          <MButton mode="transparent" noPadding onClick={() => onOpenTask(String(row.id))}>
            {value}
          </MButton>
        ) : (
          ""
        ),
      sortable: true,
    },
    { field: "status", label: "Status", sortable: true },
    { field: "assigneeLabel", label: "Assignee", sortable: true },
    { field: "dueDateLabel", label: "Due", sortable: true },
    { field: "updatedAtLabel", label: "Updated", sortable: true },
  ];
  const changeQuery = (patch: Partial<TaskTableQuery>): void => {
    const nextQuery = { ...query, ...patch };
    writeTableQuery(nextQuery);
    setQuery(nextQuery);
  };
  const applyBulk = (): void => {
    if (!canApplyBulk || client === null || projectId === null || workspaceId === null) return;
    const body = createTaskTableBulkBody(selectedTaskIds, bulkStatus, bulkAssignee, bulkDueAt);
    setBulkError(null);
    setIsBulkUpdating(true);
    void client
      .bulkUpdateTasks({ body, projectId, workspaceId })
      .then(() => {
        setSelectedRows([]);
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

  return (
    <MOperationalContentGrid>
      <WorkspacePanel eyebrow="Table" title="Task table" titleId="task-table-view-title">
        <MFlex gap="s" wrap="wrap">
          <MInput
            aria-label="Search tasks"
            placeholder="Search tasks"
            value={query.search}
            onChange={(event) => changeQuery({ page: 1, search: event.target.value })}
          />
          <MSelect
            aria-label="Filter by status"
            options={statusOptions}
            value={query.status === "" ? "all" : query.status}
            onValueChange={(value) =>
              changeQuery({ page: 1, status: value === "all" ? "" : value })
            }
          />
          <MInput
            aria-label="Filter by assignee ID"
            placeholder="Assignee ID or unassigned"
            value={query.assignee}
            onChange={(event) => changeQuery({ assignee: event.target.value, page: 1 })}
          />
          <MInput
            aria-label="Due from"
            type="date"
            value={query.dueFrom}
            onChange={(event) => changeQuery({ dueFrom: event.target.value, page: 1 })}
          />
          <MInput
            aria-label="Due to"
            type="date"
            value={query.dueTo}
            onChange={(event) => changeQuery({ dueTo: event.target.value, page: 1 })}
          />
        </MFlex>
        {bulkError === null ? null : (
          <MAlert mode="error">
            <MFlex justify="space-between">
              <MText as="p">{bulkError}</MText>
              <MButton onClick={applyBulk} disabled={!canApplyBulk || isBulkUpdating}>
                Retry bulk update
              </MButton>
            </MFlex>
          </MAlert>
        )}
        {selectedTaskIds.length === 0 ? null : (
          <MFlex gap="s" wrap="wrap">
            <MText as="p">{selectedTaskIds.length} selected</MText>
            <MSelect
              aria-label="Bulk status"
              options={bulkStatusOptions}
              value={bulkStatus === "" ? noBulkChange : bulkStatus}
              onValueChange={(value) => setBulkStatus(value === noBulkChange ? "" : value)}
            />
            <MInput
              aria-label="Bulk assignee ID"
              placeholder="Assignee ID; use unassigned to clear"
              value={bulkAssignee}
              onChange={(event) => setBulkAssignee(event.target.value)}
            />
            <MInput
              aria-label="Bulk due date"
              type="date"
              value={bulkDueAt === clearDueDate ? "" : bulkDueAt}
              onChange={(event) => setBulkDueAt(event.target.value)}
            />
            <MButton mode="secondary" onClick={() => setBulkDueAt(clearDueDate)}>
              Clear due date
            </MButton>
            <MButton disabled={!canApplyBulk || isBulkUpdating} onClick={applyBulk}>
              {isBulkUpdating ? "Updating…" : "Apply updates"}
            </MButton>
          </MFlex>
        )}
        {loadState.status === "error" ? (
          <MAlert mode="error">
            <MFlex justify="space-between">
              <MText as="p">{loadState.message}</MText>
              <MButton onClick={() => changeQuery({ ...query })}>Retry</MButton>
            </MFlex>
          </MAlert>
        ) : null}
        <MDataGrid
          key={gridKey}
          aria-labelledby="task-table-view-title"
          emptyMessage={
            loadState.status === "loading" ? "Loading tasks…" : "No tasks match these filters"
          }
          headers={headers}
          onSelect={(nextRows) => {
            if (Array.isArray(nextRows)) setSelectedRows(nextRows);
          }}
          onSort={(field, direction) =>
            changeQuery({ page: 1, sortBy: mapSortField(field), sortDirection: direction })
          }
          pagination={{
            limit: query.pageSize,
            offset: (query.page - 1) * query.pageSize,
            total: loadState.status === "loaded" ? loadState.total : 0,
            onNextPage: (offset) => changeQuery({ page: Math.floor(offset / query.pageSize) + 1 }),
            onPreviousPage: (offset) =>
              changeQuery({ page: Math.floor(offset / query.pageSize) + 1 }),
            onRowsPerPageChange: (pageSize) => changeQuery({ page: 1, pageSize }),
          }}
          rows={rows}
        />
      </WorkspacePanel>
      <WorkspacePanel eyebrow="Summary" title="Results" titleId="task-table-summary-title">
        <MText as="p" mode="secondary">
          Filters, sorting, and pagination are applied by the server.
        </MText>
        <WorkspaceMetrics
          items={[
            { label: "Total tasks", value: loadState.status === "loaded" ? loadState.total : "—" },
            { label: "Page", value: query.page },
            { label: "Page size", value: query.pageSize },
          ]}
        />
      </WorkspacePanel>
    </MOperationalContentGrid>
  );
}

function TableNotice({ message }: { message: string }): ReactElement {
  return (
    <WorkspacePanel eyebrow="Table" title="Task table" titleId="task-table-view-title">
      <MText as="p">{message}</MText>
    </WorkspacePanel>
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

function toGridRows(items: TaskSummary[], statuses: WorkspaceStatus[]): MDataGridRowType[] {
  return items.map((task) => ({
    id: task.id,
    title: task.title,
    status:
      statuses.find((status) => status.id === task.statusId)?.name ?? task.statusId ?? "Unassigned",
    assigneeLabel: task.assigneeUserId ?? "Unassigned",
    dueDateLabel:
      task.dueAt === undefined || task.dueAt === null
        ? "—"
        : new Date(task.dueAt).toLocaleDateString(),
    updatedAtLabel:
      task.updatedAt === undefined ? "—" : new Date(task.updatedAt).toLocaleDateString(),
  }));
}

function hasBulkChange(status: string, assignee: string, dueAt: string): boolean {
  return status.length > 0 || assignee.trim().length > 0 || dueAt.length > 0;
}
function mapSortField(field: string): TaskTableQuery["sortBy"] {
  return field === "status"
    ? "status"
    : field === "assigneeLabel"
      ? "assignee"
      : field === "dueDateLabel"
        ? "dueAt"
        : field === "updatedAtLabel"
          ? "updatedAt"
          : "title";
}
function readError(error: unknown): string {
  return error instanceof Error ? error.message : "The task table request failed.";
}
