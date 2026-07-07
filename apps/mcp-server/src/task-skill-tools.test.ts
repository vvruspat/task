import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyResponse,
  TaskBackendClient,
  TaskDetailResponse,
  TaskSkillApplyRequest,
  TaskSummaryResponse,
  WorkspaceStatusResponse,
} from "./backend-client.js";
import {
  createTaskSkillToolHandlers,
  parseTaskSkillApplyToolInput,
  TaskSkillToolInputError,
} from "./task-skill-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-01-01T00:00:00.000Z";

const toolInput = {
  workspaceId,
  projectId,
  taskSkillId,
  userId,
  rootTaskTitle: " Intro ",
  overrides: {
    removeSubtasks: [" Lyrics ", "Lyrics"],
    addSubtasks: [" Strings "],
  },
};

const previewResponse: PreviewTaskSkillApplyResponse = {
  workspaceId,
  projectId,
  taskSkillId,
  taskSkillVersionId,
  taskSkillVersion: 1,
  rootTaskTitle: "Intro",
  subtasks: [{ title: "Strings", source: "added" }],
};

const applyResponse: ApplyTaskSkillResponse = {
  workspaceId,
  projectId,
  taskSkillId,
  taskSkillVersionId,
  taskSkillVersion: 1,
  rootTask: {
    id: rootTaskId,
    workspaceId,
    projectId,
    parentTaskId: null,
    title: "Intro",
    description: null,
    statusId: null,
    assigneeUserId: null,
    createdByUserId: userId,
    position: "0",
    dueAt: null,
    sourceSkillId: taskSkillId,
    sourceSkillVersionId: taskSkillVersionId,
    metadata: {},
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  },
  subtasks: [],
};

test("parseTaskSkillApplyToolInput validates and normalizes tool payloads", () => {
  assert.deepEqual(parseTaskSkillApplyToolInput(toolInput), {
    workspaceId,
    projectId,
    taskSkillId,
    userId,
    rootTaskTitle: "Intro",
    overrides: {
      removeSubtasks: ["Lyrics"],
      addSubtasks: ["Strings"],
    },
  });

  assert.throws(() => parseTaskSkillApplyToolInput(null), TaskSkillToolInputError);
  assert.throws(
    () => parseTaskSkillApplyToolInput({ ...toolInput, workspaceId: "bad" }),
    TaskSkillToolInputError,
  );
  assert.throws(
    () => parseTaskSkillApplyToolInput({ ...toolInput, rootTaskTitle: "" }),
    TaskSkillToolInputError,
  );
  assert.throws(
    () =>
      parseTaskSkillApplyToolInput({
        ...toolInput,
        overrides: { addSubtasks: [1] },
      }),
    TaskSkillToolInputError,
  );
});

test("task skill tool handlers forward preview inputs to the backend client", async () => {
  const calls: TaskSkillApplyRequest[] = [];
  const handlers = createTaskSkillToolHandlers(createBackendClientStub(calls));

  const response = await handlers.previewApply(toolInput);

  assert.deepEqual(response, previewResponse);
  assert.deepEqual(calls, [
    {
      workspaceId,
      taskSkillId,
      userId,
      body: {
        projectId,
        rootTaskTitle: "Intro",
        overrides: {
          removeSubtasks: ["Lyrics"],
          addSubtasks: ["Strings"],
        },
      },
    },
  ]);
});

test("task skill tool handlers forward apply inputs to the backend client", async () => {
  const calls: TaskSkillApplyRequest[] = [];
  const handlers = createTaskSkillToolHandlers(createBackendClientStub(calls));

  const response = await handlers.apply({
    workspaceId,
    projectId,
    taskSkillId,
    userId,
    rootTaskTitle: "Intro",
  });

  assert.deepEqual(response, applyResponse);
  assert.deepEqual(calls, [
    {
      workspaceId,
      taskSkillId,
      userId,
      body: {
        projectId,
        rootTaskTitle: "Intro",
      },
    },
  ]);
});

function createBackendClientStub(calls: TaskSkillApplyRequest[]): TaskBackendClient {
  return {
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => {
      throw new Error("Not implemented.");
    },
    createProject: async () => {
      throw new Error("Not implemented.");
    },
    getProject: async () => {
      throw new Error("Not implemented.");
    },
    listActiveProjects: async () => {
      throw new Error("Not implemented.");
    },
    listActiveTasks: async (): Promise<TaskSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createTask: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskStatus: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskAssignee: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskDueDate: async (): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    previewTaskSkillApply: async (request): Promise<PreviewTaskSkillApplyResponse> => {
      calls.push(request);

      return previewResponse;
    },
    applyTaskSkill: async (request): Promise<ApplyTaskSkillResponse> => {
      calls.push(request);

      return applyResponse;
    },
  };
}
