import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import { TasksController } from "./tasks.controller.js";
import { ParseCreateTaskBodyPipe, ParseUpdateTaskStatusBodyPipe } from "./tasks.dto.js";
import { TasksService } from "./tasks.service.js";
import type { TaskCreateResult, TaskReadStore, TaskUpdateStatusResult } from "./tasks.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const statusId = "55555555-5555-4555-8555-555555555555";
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

test("TasksController uses trusted current user context for task creates", async () => {
  const input: CreateTaskInput = { title: "Record drums" };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        createResult: {
          status: "created",
          task: { ...taskSummary, title: input.title },
        },
      }),
    ),
  );

  const response = await controller.createTask(workspaceId, projectId, userId, input);

  assert.equal(response.title, input.title);
  assert.equal(response.createdByUserId, userId);
});

test("TasksController uses trusted current user context for task status updates", async () => {
  const input: UpdateTaskStatusInput = { statusId };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        updateStatusResult: {
          status: "updated",
          task: { ...taskSummary, statusId },
        },
      }),
    ),
  );

  const response = await controller.updateTaskStatus(workspaceId, projectId, taskId, userId, input);

  assert.equal(response.id, taskId);
  assert.equal(response.statusId, statusId);
});

test("ParseCreateTaskBodyPipe validates and normalizes task create payloads", () => {
  const pipe = new ParseCreateTaskBodyPipe();

  assert.deepEqual(
    pipe.transform({
      title: "  Record drums  ",
      description: "",
      parentTaskId: taskId,
      position: "2000",
      dueAt: "2026-01-02T10:00:00.000Z",
      metadata: { instrument: "drums" },
    }),
    {
      title: "Record drums",
      description: null,
      parentTaskId: taskId,
      position: "2000",
      dueAt: "2026-01-02T10:00:00.000Z",
      metadata: { instrument: "drums" },
    },
  );

  assert.throws(() => pipe.transform({ title: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Task", parentTaskId: "bad" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Task", position: "first" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Task", dueAt: "tomorrow" }), BadRequestException);
  assert.throws(() => pipe.transform({ title: "Task", metadata: [] }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParseUpdateTaskStatusBodyPipe validates task status payloads", () => {
  const pipe = new ParseUpdateTaskStatusBodyPipe();

  assert.deepEqual(pipe.transform({ statusId }), { statusId });
  assert.deepEqual(pipe.transform({ statusId: null }), { statusId: null });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ statusId: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ statusId: "bad" }), BadRequestException);
  assert.throws(() => pipe.transform({ statusId: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  tasks?: TaskSummary[] | null;
  task?: TaskDetail | null;
  createResult?: TaskCreateResult;
  updateStatusResult?: TaskUpdateStatusResult;
}): TaskReadStore {
  return {
    listActiveForProject: async (): Promise<TaskSummary[] | null> =>
      options.tasks === undefined ? [] : options.tasks,
    getForProject: async (): Promise<TaskDetail | null> =>
      options.task === undefined ? null : options.task,
    createForProject: async (): Promise<TaskCreateResult> =>
      options.createResult ?? { status: "project_not_found" },
    updateStatusForProject: async (): Promise<TaskUpdateStatusResult> =>
      options.updateStatusResult ?? { status: "task_not_found" },
  };
}
