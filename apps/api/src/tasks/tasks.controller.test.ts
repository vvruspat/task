import assert from "node:assert/strict";
import test from "node:test";
import type { TaskDetail, TaskSummary } from "./tasks.contracts.js";
import { TasksController } from "./tasks.controller.js";
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

test("TasksController uses trusted current user context for task list reads", async () => {
  const controller = new TasksController(
    new TasksService(createReadStore({ tasks: [taskSummary] })),
  );

  const response = await controller.listActiveTasks(workspaceId, projectId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, taskId);
});

test("TasksController uses trusted current user context for task detail reads", async () => {
  const controller = new TasksController(new TasksService(createReadStore({ task: taskSummary })));

  const response = await controller.getTask(workspaceId, projectId, taskId, userId);

  assert.equal(response.id, taskId);
  assert.equal(response.projectId, projectId);
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
