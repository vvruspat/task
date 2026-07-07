import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
  TaskSummaryResponse,
} from "./backend-client.js";
import {
  createTaskToolHandlers,
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

function createBackendClientStub(
  responseTasks: TaskSummaryResponse[],
  listActiveTaskCalls: Array<{ workspaceId: string; projectId: string; userId: string }> = [],
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
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
