import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  CreateTaskRequest,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
  TaskDetailResponse,
  TaskSummaryResponse,
} from "./backend-client.js";
import {
  createTaskToolHandlers,
  parseTaskCreateToolInput,
  parseTaskGetToolInput,
  parseTaskSearchToolInput,
  TaskToolInputError,
} from "./task-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const userId = "55555555-5555-4555-8555-555555555555";
const firstTaskId = "66666666-6666-4666-8666-666666666666";
const secondTaskId = "77777777-7777-4777-8777-777777777777";
const timestamp = "2026-01-01T00:00:00.000Z";

const arrangeTask: TaskSummaryResponse = {
  id: firstTaskId,
  workspaceId,
  projectId,
  parentTaskId: null,
  title: "Arrange intro",
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
  createdAt: timestamp,
  updatedAt: timestamp,
};

const taskDetail: TaskDetailResponse = {
  ...arrangeTask,
};

const tasks: TaskSummaryResponse[] = [
  arrangeTask,
  {
    ...arrangeTask,
    id: secondTaskId,
    title: "Record vocals",
    position: "2000",
  },
];

test("parseTaskSearchToolInput validates and normalizes task search payloads", () => {
  assert.deepEqual(
    parseTaskSearchToolInput({
      workspaceId,
      projectId,
      userId,
      query: "  arrange  ",
    }),
    {
      workspaceId,
      projectId,
      userId,
      query: "arrange",
    },
  );

  assert.deepEqual(parseTaskSearchToolInput({ workspaceId, projectId, userId }), {
    workspaceId,
    projectId,
    userId,
  });

  assert.throws(
    () => parseTaskSearchToolInput({ workspaceId, projectId, userId, query: "" }),
    TaskToolInputError,
  );
  assert.throws(
    () => parseTaskSearchToolInput({ workspaceId, projectId: "bad", userId }),
    TaskToolInputError,
  );
});

test("parseTaskGetToolInput validates task get payloads", () => {
  assert.deepEqual(parseTaskGetToolInput({ workspaceId, projectId, taskId: firstTaskId, userId }), {
    workspaceId,
    projectId,
    taskId: firstTaskId,
    userId,
  });

  assert.throws(
    () => parseTaskGetToolInput({ workspaceId, projectId, taskId: "bad", userId }),
    TaskToolInputError,
  );
});

test("parseTaskCreateToolInput validates and normalizes task create payloads", () => {
  assert.deepEqual(
    parseTaskCreateToolInput({
      workspaceId,
      projectId,
      userId,
      title: "  Arrange intro  ",
      parentTaskId: null,
      description: "   ",
      position: " 1000 ",
      dueAt: "2026-01-01",
      metadata: { source: "manual" },
    }),
    {
      workspaceId,
      projectId,
      userId,
      title: "Arrange intro",
      parentTaskId: null,
      description: null,
      position: "1000",
      dueAt: timestamp,
      metadata: { source: "manual" },
    },
  );

  assert.throws(
    () => parseTaskCreateToolInput({ workspaceId, projectId, userId, title: "" }),
    TaskToolInputError,
  );
  assert.throws(
    () =>
      parseTaskCreateToolInput({
        workspaceId,
        projectId,
        userId,
        title: "Arrange",
        parentTaskId: "bad",
      }),
    TaskToolInputError,
  );
  assert.throws(
    () =>
      parseTaskCreateToolInput({
        workspaceId,
        projectId,
        userId,
        title: "Arrange",
        position: "first",
      }),
    TaskToolInputError,
  );
  assert.throws(
    () =>
      parseTaskCreateToolInput({
        workspaceId,
        projectId,
        userId,
        title: "Arrange",
        metadata: [],
      }),
    TaskToolInputError,
  );
});

test("task search handler lists active tasks when query is absent", async () => {
  const client = createBackendClientStub(tasks);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(await handlers.search({ workspaceId, projectId, userId }), tasks);
});

test("task search handler filters active tasks by title", async () => {
  const client = createBackendClientStub(tasks);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(await handlers.search({ workspaceId, projectId, userId, query: "ARRANGE" }), [
    arrangeTask,
  ]);
});

test("task search handler forwards project identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; projectId: string; userId: string }> = [];
  const client = createBackendClientStub(tasks, calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(await handlers.search({ workspaceId, projectId, userId }), tasks);
  assert.deepEqual(calls, [{ workspaceId, projectId, userId }]);
});

test("task get handler forwards task identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; projectId: string; taskId: string; userId: string }> =
    [];
  const client = createBackendClientStub(tasks, [], calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(
    await handlers.get({ workspaceId, projectId, taskId: firstTaskId, userId }),
    taskDetail,
  );
  assert.deepEqual(calls, [{ workspaceId, projectId, taskId: firstTaskId, userId }]);
});

test("task create handler forwards task payloads to the backend client", async () => {
  const calls: CreateTaskRequest[] = [];
  const client = createBackendClientStub(tasks, [], [], calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(
    await handlers.create({
      workspaceId,
      projectId,
      userId,
      title: "Arrange intro",
      parentTaskId: null,
      description: "Opening section",
      position: "1000",
      dueAt: timestamp,
      metadata: { source: "manual" },
    }),
    taskDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      userId,
      body: {
        title: "Arrange intro",
        parentTaskId: null,
        description: "Opening section",
        position: "1000",
        dueAt: timestamp,
        metadata: { source: "manual" },
      },
    },
  ]);
});

function createBackendClientStub(
  responseTasks: TaskSummaryResponse[],
  listActiveTaskCalls: Array<{ workspaceId: string; projectId: string; userId: string }> = [],
  getTaskCalls: Array<{
    workspaceId: string;
    projectId: string;
    taskId: string;
    userId: string;
  }> = [],
  createTaskCalls: CreateTaskRequest[] = [],
): TaskBackendClient {
  return {
    createProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    getProject: async (): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    listActiveTasks: async (request): Promise<TaskSummaryResponse[]> => {
      listActiveTaskCalls.push(request);

      return responseTasks;
    },
    getTask: async (request): Promise<TaskDetailResponse> => {
      getTaskCalls.push(request);

      return taskDetail;
    },
    createTask: async (request): Promise<TaskDetailResponse> => {
      createTaskCalls.push(request);

      return taskDetail;
    },
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
