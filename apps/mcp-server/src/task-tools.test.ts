import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  CreateTaskRequest,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSummaryResponse,
  UpdateTaskAssigneeRequest,
  UpdateTaskDueDateRequest,
  UpdateTaskStatusRequest,
  WorkspaceStatusResponse,
} from "./backend-client.js";
import {
  createTaskToolHandlers,
  parseTaskCreateToolInput,
  parseTaskGetToolInput,
  parseTaskSearchToolInput,
  parseTaskSetAssigneeToolInput,
  parseTaskSetDueDateToolInput,
  parseTaskSetStatusToolInput,
  TaskToolInputError,
} from "./task-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const userId = "55555555-5555-4555-8555-555555555555";
const firstTaskId = "66666666-6666-4666-8666-666666666666";
const secondTaskId = "77777777-7777-4777-8777-777777777777";
const statusId = "88888888-8888-4888-8888-888888888888";
const assigneeUserId = "99999999-9999-4999-8999-999999999999";
const timestamp = "2026-01-01T00:00:00.000Z";
const dueAt = "2026-01-03T12:00:00.000Z";

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

test("parseTaskSetStatusToolInput validates task status payloads", () => {
  assert.deepEqual(
    parseTaskSetStatusToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      statusId: ` ${statusId} `,
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      statusId,
    },
  );

  assert.deepEqual(
    parseTaskSetStatusToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      statusId: null,
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      statusId: null,
    },
  );

  assert.throws(
    () =>
      parseTaskSetStatusToolInput({
        workspaceId,
        projectId,
        taskId: firstTaskId,
        userId,
        statusId: "bad",
      }),
    TaskToolInputError,
  );
  assert.throws(
    () => parseTaskSetStatusToolInput({ workspaceId, projectId, taskId: firstTaskId, userId }),
    TaskToolInputError,
  );
});

test("parseTaskSetAssigneeToolInput validates task assignee payloads", () => {
  assert.deepEqual(
    parseTaskSetAssigneeToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      assigneeUserId: ` ${assigneeUserId} `,
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      assigneeUserId,
    },
  );

  assert.deepEqual(
    parseTaskSetAssigneeToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      assigneeUserId: null,
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      assigneeUserId: null,
    },
  );

  assert.throws(
    () =>
      parseTaskSetAssigneeToolInput({
        workspaceId,
        projectId,
        taskId: firstTaskId,
        userId,
        assigneeUserId: "bad",
      }),
    TaskToolInputError,
  );
  assert.throws(
    () => parseTaskSetAssigneeToolInput({ workspaceId, projectId, taskId: firstTaskId, userId }),
    TaskToolInputError,
  );
});

test("parseTaskSetDueDateToolInput validates task due date payloads", () => {
  assert.deepEqual(
    parseTaskSetDueDateToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      dueAt: " 2026-01-03T12:00:00+02:00 ",
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      dueAt: "2026-01-03T10:00:00.000Z",
    },
  );

  assert.deepEqual(
    parseTaskSetDueDateToolInput({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      dueAt: null,
    }),
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      dueAt: null,
    },
  );

  assert.throws(
    () =>
      parseTaskSetDueDateToolInput({
        workspaceId,
        projectId,
        taskId: firstTaskId,
        userId,
        dueAt: "tomorrow",
      }),
    TaskToolInputError,
  );
  assert.throws(
    () => parseTaskSetDueDateToolInput({ workspaceId, projectId, taskId: firstTaskId, userId }),
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

test("task set status handler forwards status payloads to the backend client", async () => {
  const calls: UpdateTaskStatusRequest[] = [];
  const client = createBackendClientStub(tasks, [], [], [], calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(
    await handlers.setStatus({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      statusId: null,
    }),
    taskDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      body: {
        statusId: null,
      },
    },
  ]);
});

test("task set assignee handler forwards assignee payloads to the backend client", async () => {
  const calls: UpdateTaskAssigneeRequest[] = [];
  const client = createBackendClientStub(tasks, [], [], [], [], calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(
    await handlers.setAssignee({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      assigneeUserId,
    }),
    taskDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      body: {
        assigneeUserId,
      },
    },
  ]);
});

test("task set due date handler forwards due date payloads to the backend client", async () => {
  const calls: UpdateTaskDueDateRequest[] = [];
  const client = createBackendClientStub(tasks, [], [], [], [], [], calls);
  const handlers = createTaskToolHandlers(client);

  assert.deepEqual(
    await handlers.setDueDate({
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      dueAt,
    }),
    taskDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      projectId,
      taskId: firstTaskId,
      userId,
      body: {
        dueAt,
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
  updateTaskStatusCalls: UpdateTaskStatusRequest[] = [],
  updateTaskAssigneeCalls: UpdateTaskAssigneeRequest[] = [],
  updateTaskDueDateCalls: UpdateTaskDueDateRequest[] = [],
): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getWorkspace: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceMembers: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
    },
    listTaskSkills: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getTaskSkill: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskComments: async (): Promise<TaskCommentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskComment: async (): Promise<TaskCommentResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskAttachments: async (): Promise<TaskAttachmentResponse[]> => {
      throw new Error("Not implemented.");
    },
    createTaskLinkAttachment: async (): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
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
    updateTaskStatus: async (request): Promise<TaskDetailResponse> => {
      updateTaskStatusCalls.push(request);

      return taskDetail;
    },
    updateTaskAssignee: async (request): Promise<TaskDetailResponse> => {
      updateTaskAssigneeCalls.push(request);

      return taskDetail;
    },
    updateTaskDueDate: async (request): Promise<TaskDetailResponse> => {
      updateTaskDueDateCalls.push(request);

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
