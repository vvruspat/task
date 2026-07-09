import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateTaskInput,
  MoveTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import { TasksController } from "./tasks.controller.js";
import {
  ParseCreateTaskBodyPipe,
  ParseMoveTaskBodyPipe,
  ParseUpdateTaskAssigneeBodyPipe,
  ParseUpdateTaskBodyPipe,
  ParseUpdateTaskDueDateBodyPipe,
  ParseUpdateTaskStatusBodyPipe,
} from "./tasks.dto.js";
import { TasksService } from "./tasks.service.js";
import type {
  TaskArchiveResult,
  TaskCreateResult,
  TaskMoveResult,
  TaskReadStore,
  TaskUpdateAssigneeResult,
  TaskUpdateDueDateResult,
  TaskUpdateResult,
  TaskUpdateStatusResult,
} from "./tasks.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const statusId = "55555555-5555-4555-8555-555555555555";
const assigneeUserId = "66666666-6666-4666-8666-666666666666";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const archivedAt = new Date("2026-01-04T00:00:00.000Z");
const dueAt = "2026-01-03T12:00:00.000Z";

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

test("TasksController uses trusted current user context for task updates", async () => {
  const input: UpdateTaskInput = { description: "Second take", metadata: { take: 2 } };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        updateResult: {
          status: "updated",
          task: {
            ...taskSummary,
            description: input.description ?? null,
            metadata: input.metadata ?? {},
          },
        },
      }),
    ),
  );

  const response = await controller.updateTask(workspaceId, projectId, taskId, userId, input);

  assert.equal(response.id, taskId);
  assert.equal(response.description, input.description);
  assert.deepEqual(response.metadata, input.metadata);
});

test("TasksController uses trusted current user context for task moves", async () => {
  const input: MoveTaskInput = { parentTaskId: null, position: "3000" };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        moveResult: {
          status: "updated",
          task: { ...taskSummary, parentTaskId: input.parentTaskId, position: input.position },
        },
      }),
    ),
  );

  const response = await controller.moveTask(workspaceId, projectId, taskId, userId, input);

  assert.equal(response.id, taskId);
  assert.equal(response.parentTaskId, input.parentTaskId);
  assert.equal(response.position, input.position);
});

test("TasksController uses trusted current user context for task assignee updates", async () => {
  const input: UpdateTaskAssigneeInput = { assigneeUserId };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        updateAssigneeResult: {
          status: "updated",
          task: { ...taskSummary, assigneeUserId },
        },
      }),
    ),
  );

  const response = await controller.updateTaskAssignee(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.id, taskId);
  assert.equal(response.assigneeUserId, assigneeUserId);
});

test("TasksController uses trusted current user context for task due date updates", async () => {
  const input: UpdateTaskDueDateInput = { dueAt };
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        updateDueDateResult: {
          status: "updated",
          task: { ...taskSummary, dueAt: new Date(dueAt) },
        },
      }),
    ),
  );

  const response = await controller.updateTaskDueDate(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.id, taskId);
  assert.deepEqual(response.dueAt, new Date(dueAt));
});

test("TasksController uses trusted current user context for task archives", async () => {
  const controller = new TasksController(
    new TasksService(
      createReadStore({
        archiveResult: {
          status: "archived",
          task: { ...taskSummary, archivedAt },
        },
      }),
    ),
  );

  const response = await controller.archiveTask(workspaceId, projectId, taskId, userId);

  assert.equal(response.id, taskId);
  assert.equal(response.archivedAt?.toISOString(), archivedAt.toISOString());
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

test("ParseUpdateTaskBodyPipe validates and normalizes task update payloads", () => {
  const pipe = new ParseUpdateTaskBodyPipe();

  assert.deepEqual(
    pipe.transform({
      title: "  Record bass DI  ",
      description: "",
      metadata: { instrument: "bass" },
    }),
    {
      title: "Record bass DI",
      description: null,
      metadata: { instrument: "bass" },
    },
  );
  assert.deepEqual(pipe.transform({ description: null }), { description: null });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ title: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ metadata: [] }), BadRequestException);
  assert.throws(() => pipe.transform({ description: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParseMoveTaskBodyPipe validates task move payloads", () => {
  const pipe = new ParseMoveTaskBodyPipe();

  assert.deepEqual(pipe.transform({ parentTaskId: taskId, position: " 2000 " }), {
    parentTaskId: taskId,
    position: "2000",
  });
  assert.deepEqual(pipe.transform({ parentTaskId: null, position: "-100.5" }), {
    parentTaskId: null,
    position: "-100.5",
  });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(
    () => pipe.transform({ parentTaskId: "bad", position: "1000" }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform({ parentTaskId: taskId, position: "" }), BadRequestException);
  assert.throws(
    () => pipe.transform({ parentTaskId: taskId, position: "first" }),
    BadRequestException,
  );
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

test("ParseUpdateTaskAssigneeBodyPipe validates task assignee payloads", () => {
  const pipe = new ParseUpdateTaskAssigneeBodyPipe();

  assert.deepEqual(pipe.transform({ assigneeUserId }), { assigneeUserId });
  assert.deepEqual(pipe.transform({ assigneeUserId: null }), { assigneeUserId: null });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ assigneeUserId: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ assigneeUserId: "bad" }), BadRequestException);
  assert.throws(() => pipe.transform({ assigneeUserId: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParseUpdateTaskDueDateBodyPipe validates task due date payloads", () => {
  const pipe = new ParseUpdateTaskDueDateBodyPipe();

  assert.deepEqual(pipe.transform({ dueAt }), { dueAt });
  assert.deepEqual(pipe.transform({ dueAt: null }), { dueAt: null });
  assert.deepEqual(pipe.transform({ dueAt: "2026-01-03T12:00:00+02:00" }), {
    dueAt: "2026-01-03T10:00:00.000Z",
  });

  assert.throws(() => pipe.transform({}), BadRequestException);
  assert.throws(() => pipe.transform({ dueAt: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ dueAt: "tomorrow" }), BadRequestException);
  assert.throws(() => pipe.transform({ dueAt: 1 }), BadRequestException);
  assert.throws(() => pipe.transform(null), BadRequestException);
});

function createReadStore(options: {
  tasks?: TaskSummary[] | null;
  task?: TaskDetail | null;
  archiveResult?: TaskArchiveResult;
  createResult?: TaskCreateResult;
  updateResult?: TaskUpdateResult;
  moveResult?: TaskMoveResult;
  updateStatusResult?: TaskUpdateStatusResult;
  updateAssigneeResult?: TaskUpdateAssigneeResult;
  updateDueDateResult?: TaskUpdateDueDateResult;
}): TaskReadStore {
  return {
    listActiveForProject: async (): Promise<TaskSummary[] | null> =>
      options.tasks === undefined ? [] : options.tasks,
    getForProject: async (): Promise<TaskDetail | null> =>
      options.task === undefined ? null : options.task,
    createForProject: async (): Promise<TaskCreateResult> =>
      options.createResult ?? { status: "project_not_found" },
    updateForProject: async (): Promise<TaskUpdateResult> =>
      options.updateResult ?? { status: "task_not_found" },
    moveForProject: async (): Promise<TaskMoveResult> =>
      options.moveResult ?? { status: "task_not_found" },
    archiveForProject: async (): Promise<TaskArchiveResult> =>
      options.archiveResult ?? { status: "task_not_found" },
    updateStatusForProject: async (): Promise<TaskUpdateStatusResult> =>
      options.updateStatusResult ?? { status: "task_not_found" },
    updateAssigneeForProject: async (): Promise<TaskUpdateAssigneeResult> =>
      options.updateAssigneeResult ?? { status: "task_not_found" },
    updateDueDateForProject: async (): Promise<TaskUpdateDueDateResult> =>
      options.updateDueDateResult ?? { status: "task_not_found" },
  };
}
