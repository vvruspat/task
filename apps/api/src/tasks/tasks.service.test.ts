import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type {
  CreateTaskInput,
  TaskDetail,
  TaskSummary,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import { TaskDetailDto, TaskSummaryDto } from "./tasks.dto.js";
import { TasksService } from "./tasks.service.js";
import type {
  TaskCreateResult,
  TaskReadStore,
  TaskUpdateAssigneeResult,
  TaskUpdateDueDateResult,
  TaskUpdateStatusResult,
} from "./tasks.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const statusId = "55555555-5555-4555-8555-555555555555";
const assigneeUserId = "66666666-6666-4666-8666-666666666666";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
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

test("TasksService creates a task for writable workspace members", async () => {
  const input: CreateTaskInput = {
    title: "Record drums",
    description: "Studio take",
    position: "2000",
  };
  const service = new TasksService(
    createReadStore({
      createResult: {
        status: "created",
        task: {
          ...taskSummary,
          title: input.title,
          description: input.description ?? null,
          position: input.position ?? "0",
        },
      },
    }),
  );

  const response = await service.createTask(workspaceId, projectId, userId, input);

  assert.ok(response instanceof TaskDetailDto);
  assert.equal(response.title, input.title);
  assert.equal(response.createdByUserId, userId);
});

test("TasksService updates task status for writable workspace members", async () => {
  const input: UpdateTaskStatusInput = { statusId };
  const service = new TasksService(
    createReadStore({
      updateStatusResult: {
        status: "updated",
        task: { ...taskSummary, statusId },
      },
    }),
  );

  const response = await service.updateTaskStatus(workspaceId, projectId, taskId, userId, input);

  assert.ok(response instanceof TaskDetailDto);
  assert.equal(response.id, taskId);
  assert.equal(response.statusId, statusId);
});

test("TasksService updates task assignee for writable workspace members", async () => {
  const input: UpdateTaskAssigneeInput = { assigneeUserId };
  const service = new TasksService(
    createReadStore({
      updateAssigneeResult: {
        status: "updated",
        task: { ...taskSummary, assigneeUserId },
      },
    }),
  );

  const response = await service.updateTaskAssignee(workspaceId, projectId, taskId, userId, input);

  assert.ok(response instanceof TaskDetailDto);
  assert.equal(response.id, taskId);
  assert.equal(response.assigneeUserId, assigneeUserId);
});

test("TasksService updates task due date for writable workspace members", async () => {
  const input: UpdateTaskDueDateInput = { dueAt };
  const service = new TasksService(
    createReadStore({
      updateDueDateResult: {
        status: "updated",
        task: { ...taskSummary, dueAt: new Date(dueAt) },
      },
    }),
  );

  const response = await service.updateTaskDueDate(workspaceId, projectId, taskId, userId, input);

  assert.ok(response instanceof TaskDetailDto);
  assert.equal(response.id, taskId);
  assert.deepEqual(response.dueAt, new Date(dueAt));
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
  await assert.rejects(
    () => service.createTask(workspaceId, projectId, userId, { title: "Hidden" }),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateTaskStatus(workspaceId, projectId, taskId, userId, { statusId }),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateTaskAssignee(workspaceId, projectId, taskId, userId, { assigneeUserId }),
    NotFoundException,
  );
  await assert.rejects(
    () => service.updateTaskDueDate(workspaceId, projectId, taskId, userId, { dueAt }),
    NotFoundException,
  );
});

test("TasksService rejects task creation without write permission", async () => {
  const service = new TasksService(createReadStore({ createResult: { status: "forbidden" } }));

  await assert.rejects(
    () => service.createTask(workspaceId, projectId, userId, { title: "Hidden" }),
    ForbiddenException,
  );
});

test("TasksService rejects status updates without write permission", async () => {
  const service = new TasksService(
    createReadStore({ updateStatusResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.updateTaskStatus(workspaceId, projectId, taskId, userId, { statusId }),
    ForbiddenException,
  );
});

test("TasksService rejects assignee updates without write permission", async () => {
  const service = new TasksService(
    createReadStore({ updateAssigneeResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.updateTaskAssignee(workspaceId, projectId, taskId, userId, { assigneeUserId }),
    ForbiddenException,
  );
});

test("TasksService rejects due date updates without write permission", async () => {
  const service = new TasksService(
    createReadStore({ updateDueDateResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () => service.updateTaskDueDate(workspaceId, projectId, taskId, userId, { dueAt }),
    ForbiddenException,
  );
});

test("TasksService rejects statuses outside the workspace", async () => {
  const service = new TasksService(
    createReadStore({ updateStatusResult: { status: "invalid_status" } }),
  );

  await assert.rejects(
    () => service.updateTaskStatus(workspaceId, projectId, taskId, userId, { statusId }),
    BadRequestException,
  );
});

test("TasksService rejects assignees outside the workspace", async () => {
  const service = new TasksService(
    createReadStore({ updateAssigneeResult: { status: "invalid_assignee" } }),
  );

  await assert.rejects(
    () => service.updateTaskAssignee(workspaceId, projectId, taskId, userId, { assigneeUserId }),
    BadRequestException,
  );
});

test("TasksService rejects parent tasks outside the project", async () => {
  const service = new TasksService(
    createReadStore({ createResult: { status: "invalid_parent_task" } }),
  );

  await assert.rejects(
    () =>
      service.createTask(workspaceId, projectId, userId, { parentTaskId: taskId, title: "Sub" }),
    BadRequestException,
  );
});

function createReadStore(options: {
  tasks?: TaskSummary[] | null;
  task?: TaskDetail | null;
  createResult?: TaskCreateResult;
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
    updateStatusForProject: async (): Promise<TaskUpdateStatusResult> =>
      options.updateStatusResult ?? { status: "task_not_found" },
    updateAssigneeForProject: async (): Promise<TaskUpdateAssigneeResult> =>
      options.updateAssigneeResult ?? { status: "task_not_found" },
    updateDueDateForProject: async (): Promise<TaskUpdateDueDateResult> =>
      options.updateDueDateResult ?? { status: "task_not_found" },
  };
}
