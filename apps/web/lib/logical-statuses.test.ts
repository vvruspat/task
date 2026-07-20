import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceStatus } from "@task/api-client";
import {
  logicalStatusKeyForTask,
  mergeLogicalStatuses,
  normalizeStatusFilterValue,
  resolveProjectStatusId,
} from "./logical-statuses.ts";

const firstProjectId = "11111111-1111-4111-8111-111111111111";
const secondProjectId = "22222222-2222-4222-8222-222222222222";
const firstBacklogId = "33333333-3333-4333-8333-333333333333";
const secondBacklogId = "44444444-4444-4444-8444-444444444444";

test("mergeLogicalStatuses merges project statuses by normalized name", () => {
  const statuses = [
    workspaceStatus(firstBacklogId, firstProjectId, "Backlog", "#111111", "1000"),
    workspaceStatus(secondBacklogId, secondProjectId, "  BACKLOG  ", "#222222", "1000"),
    workspaceStatus(
      "55555555-5555-4555-8555-555555555555",
      firstProjectId,
      "Todo",
      "#333333",
      "2000",
    ),
  ];

  assert.deepEqual(
    mergeLogicalStatuses(statuses).map(({ key, name }) => ({ key, name })),
    [
      { key: "status-name:backlog", name: "Backlog" },
      { key: "status-name:todo", name: "Todo" },
    ],
  );
});

test("logical status keys preserve legacy filters and resolve a project-specific status", () => {
  const statuses = [
    workspaceStatus(firstBacklogId, firstProjectId, "Backlog", "#111111", "1000"),
    workspaceStatus(secondBacklogId, secondProjectId, "Backlog", "#222222", "1000"),
  ];
  const logicalKey = logicalStatusKeyForTask(firstBacklogId, statuses);

  assert.equal(logicalKey, "status-name:backlog");
  assert.equal(normalizeStatusFilterValue(firstBacklogId, statuses), logicalKey);
  assert.equal(resolveProjectStatusId(secondProjectId, logicalKey, statuses), secondBacklogId);
  assert.equal(resolveProjectStatusId(secondProjectId, "none", statuses), null);
});

function workspaceStatus(
  id: string,
  projectId: string,
  name: string,
  color: string,
  position: string,
): WorkspaceStatus {
  return {
    id,
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    projectId,
    name,
    color,
    position,
    isDone: false,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  };
}
