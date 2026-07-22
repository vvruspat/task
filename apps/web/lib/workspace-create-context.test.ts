import assert from "node:assert/strict";
import test from "node:test";
import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import {
  collectWorkspaceTaskLabels,
  isWorkspaceCreateContext,
} from "./workspace-create-context.ts";

test("workspace create context normalizes labels from route-independent task data", () => {
  const tasks = [
    taskSummary("task-1", [" Production ", "mix"]),
    taskSummary("task-2", ["production", 42, "Master"]),
  ];
  assert.deepEqual(collectWorkspaceTaskLabels(tasks), ["Master", "mix", "Production"]);
});

test("workspace create context validates its external response boundary", () => {
  assert.equal(
    isWorkspaceCreateContext({
      labels: ["production"],
      projectlessProjectId: null,
      statuses: [workspaceStatus()],
    }),
    true,
  );
  assert.equal(
    isWorkspaceCreateContext({ labels: [1], projectlessProjectId: null, statuses: [] }),
    false,
  );
});

function taskSummary(id: string, labels: unknown[]): TaskSummary {
  return {
    archivedAt: null,
    assigneeUserId: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    createdByUserId: "user-id",
    description: null,
    dueAt: null,
    id,
    metadata: { labels },
    number: 1,
    parentTaskId: null,
    position: "1000",
    projectId: "project-id",
    sourceSkillId: null,
    sourceSkillVersionId: null,
    statusId: null,
    title: id,
    updatedAt: "2026-07-22T00:00:00.000Z",
    workspaceId: "workspace-id",
  };
}

function workspaceStatus(): WorkspaceStatus {
  return {
    color: "#3b82f6",
    createdAt: "2026-07-22T00:00:00.000Z",
    id: "status-id",
    isDone: false,
    name: "Backlog",
    position: "1000",
    projectId: "project-id",
    updatedAt: "2026-07-22T00:00:00.000Z",
    workspaceId: "workspace-id",
  };
}
