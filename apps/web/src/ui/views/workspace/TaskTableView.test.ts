import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskTableBulkBody,
  createTaskTableGridKey,
  createTaskTableRequest,
  parseTaskTableQuery,
} from "./taskTableViewModels.js";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("task table query preserves server-side filters and pagination", () => {
  const query = parseTaskTableQuery(
    "?tableSearch=record&tableStatus=unassigned&tableAssignee=unassigned&tableDueFrom=2026-07-01&tableDueTo=2026-07-31&tablePage=2&tablePageSize=50&tableSortBy=dueAt&tableSortDirection=asc",
  );

  assert.deepEqual(createTaskTableRequest(query, projectId, workspaceId), {
    assigneeFilter: "unassigned",
    dueFrom: "2026-07-01T00:00:00.000Z",
    dueTo: "2026-07-31T23:59:59.999Z",
    page: 2,
    pageSize: 50,
    projectId,
    search: "record",
    sortBy: "dueAt",
    sortDirection: "asc",
    statusFilter: "unassigned",
    workspaceId,
  });
});

test("task table bulk update can clear nullable fields", () => {
  assert.deepEqual(
    createTaskTableBulkBody(["task-1"], "unassigned", "unassigned", "clear-due-date"),
    { assigneeUserId: null, dueAt: null, statusId: null, taskIds: ["task-1"] },
  );
});

test("task table grid key changes after reload with unchanged query", () => {
  const query = parseTaskTableQuery("?tablePage=1");

  assert.notEqual(
    createTaskTableGridKey(query, projectId, 1, workspaceId),
    createTaskTableGridKey(query, projectId, 2, workspaceId),
  );
});
