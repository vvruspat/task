import type { BulkUpdateTasksInput, ListTaskTableRequestInput } from "@task/api-client";

export const taskTableUnassigned = "unassigned";
export const taskTableClearDueDate = "clear-due-date";

export type TaskTableQuery = {
  assignee: string;
  dueFrom: string;
  dueTo: string;
  page: number;
  pageSize: number;
  search: string;
  sortBy: NonNullable<ListTaskTableRequestInput["sortBy"]>;
  sortDirection: NonNullable<ListTaskTableRequestInput["sortDirection"]>;
  status: string;
};

const defaultQuery: TaskTableQuery = {
  assignee: "",
  dueFrom: "",
  dueTo: "",
  page: 1,
  pageSize: 25,
  search: "",
  sortBy: "updatedAt",
  sortDirection: "desc",
  status: "",
};

export function parseTaskTableQuery(search: string): TaskTableQuery {
  const params = new URLSearchParams(search);
  const page = Number(params.get("tablePage"));
  const pageSize = Number(params.get("tablePageSize"));
  const sortBy = params.get("tableSortBy");
  const sortDirection = params.get("tableSortDirection");
  return {
    assignee: params.get("tableAssignee") ?? "",
    dueFrom: params.get("tableDueFrom") ?? "",
    dueTo: params.get("tableDueTo") ?? "",
    page: Number.isInteger(page) && page > 0 ? page : defaultQuery.page,
    pageSize: [10, 25, 50].includes(pageSize) ? pageSize : defaultQuery.pageSize,
    search: params.get("tableSearch") ?? "",
    sortBy: isSortBy(sortBy) ? sortBy : defaultQuery.sortBy,
    sortDirection:
      sortDirection === "asc" || sortDirection === "desc"
        ? sortDirection
        : defaultQuery.sortDirection,
    status: params.get("tableStatus") ?? "",
  };
}

export function createTaskTableRequest(
  query: TaskTableQuery,
  projectId: string,
  workspaceId: string,
): ListTaskTableRequestInput {
  const assignee = query.assignee.trim();
  const status = query.status;
  const search = query.search.trim();
  const dueFrom = toIsoDayBoundary(query.dueFrom, "start");
  const dueTo = toIsoDayBoundary(query.dueTo, "end");
  return {
    page: query.page,
    pageSize: query.pageSize,
    projectId,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    workspaceId,
    ...(search.length > 0 ? { search } : {}),
    ...(status === taskTableUnassigned
      ? { statusFilter: taskTableUnassigned }
      : status.length > 0
        ? { statusId: status }
        : {}),
    ...(assignee === taskTableUnassigned
      ? { assigneeFilter: taskTableUnassigned }
      : assignee.length > 0
        ? { assigneeUserId: assignee }
        : {}),
    ...(dueFrom === null ? {} : { dueFrom }),
    ...(dueTo === null ? {} : { dueTo }),
  };
}

export function createTaskTableBulkBody(
  taskIds: string[],
  status: string,
  assignee: string,
  dueAt: string,
): BulkUpdateTasksInput {
  return {
    taskIds,
    ...(status.length > 0 ? { statusId: status === taskTableUnassigned ? null : status } : {}),
    ...(assignee.trim().length > 0
      ? { assigneeUserId: assignee.trim() === taskTableUnassigned ? null : assignee.trim() }
      : {}),
    ...(dueAt === taskTableClearDueDate
      ? { dueAt: null }
      : dueAt.length > 0
        ? { dueAt: `${dueAt}T00:00:00.000Z` }
        : {}),
  };
}

export function createTaskTableGridKey(
  query: TaskTableQuery,
  projectId: string | null,
  revision: number,
  workspaceId: string | null,
): string {
  return `${projectId ?? "no-project"}:${workspaceId ?? "no-workspace"}:${revision}:${JSON.stringify(query)}`;
}

function isSortBy(value: string | null): value is TaskTableQuery["sortBy"] {
  return (
    value === "title" ||
    value === "status" ||
    value === "assignee" ||
    value === "dueAt" ||
    value === "createdAt" ||
    value === "updatedAt"
  );
}

function toIsoDayBoundary(value: string, boundary: "start" | "end"): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.valueOf()) || !date.toISOString().startsWith(value)
    ? null
    : date.toISOString();
}
