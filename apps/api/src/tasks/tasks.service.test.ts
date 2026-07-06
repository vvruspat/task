import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { TaskDetail, TaskSummary } from "./tasks.contracts.js";
import { TaskDetailDto, TaskSummaryDto } from "./tasks.dto.js";
import { TasksService } from "./tasks.service.js";
import type { TaskReadStore } from "./tasks.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const taskSummary: TaskSummary = {
  id: taskId,
  workspaceId,
  projectId,
  parentTaskId: null,
  title: "Record bass",
  description: null,
  statusId: null,
  assigneeUserId: null,
  createdByUserId: userId,
  position: "1000",
  dueAt: null,
  sourceSkillId: null,
  sourceSkillVersionId: null,
  metadata: {},
  archivedAt: null,
  createdAt,
  updatedAt: createdAt,
};

test("TasksService maps visible active tasks to DTOs", async () => {
  const service = new TasksService(createReadStore({ tasks: [taskSummary] }));

  const response = await service.listActiveTasks(workspaceId, projectId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof TaskSummaryDto);
  assert.equal(response[0]?.id, taskId);
  assert.equal(response[0]?.title, taskSummary.title);
});

test("TasksService returns one visible task DTO", async () => {
  const service = new TasksService(createReadStore({ task: taskSummary }));

  const response = await service.getTask(workspaceId, projectId, taskId, userId);

  assert.ok(response instanceof TaskDetailDto);
  assert.equal(response.id, taskId);
  assert.equal(response.projectId, projectId);
});

test("TasksService hides inaccessible projects and missing tasks", async () => {
  const service = new TasksService(createReadStore({ task: null, tasks: null }));

  await assert.rejects(
    () => service.listActiveTasks(workspaceId, projectId, userId),
    NotFoundException,
  );
  await assert.rejects(
    () => service.getTask(workspaceId, projectId, taskId, userId),
    NotFoundException,
  );
});

function createReadStore(options: {
  tasks?: TaskSummary[] | null;
  task?: TaskDetail | null;
}): TaskReadStore {
  return {
    listActiveForProject: async (): Promise<TaskSummary[] | null> =>
      options.tasks === undefined ? [] : options.tasks,
    getForProject: async (): Promise<TaskDetail | null> =>
      options.task === undefined ? null : options.task,
  };
}
