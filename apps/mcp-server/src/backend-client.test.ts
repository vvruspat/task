import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskBackendClient,
  TaskBackendClientError,
  type TaskBackendFetch,
  type TaskBackendFetchInit,
} from "./backend-client.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const subtaskId = "77777777-7777-4777-8777-777777777777";
const timestamp = "2026-01-01T00:00:00.000Z";

const requestBody = {
  projectId,
  rootTaskTitle: "Intro",
  overrides: {
    addSubtasks: ["Strings"],
    removeSubtasks: ["Lyrics"],
  },
};

const taskDetail = {
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
};

test("previewTaskSkillApply posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, {
    workspaceId,
    projectId,
    taskSkillId,
    taskSkillVersionId,
    taskSkillVersion: 1,
    rootTaskTitle: "Intro",
    subtasks: [{ title: "Strings", source: "added" }],
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.previewTaskSkillApply({
    workspaceId,
    taskSkillId,
    userId,
    body: requestBody,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills/${taskSkillId}/preview-apply`,
  );
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(fetchCalls[0]?.init.body ?? ""), requestBody);
  assert.equal(response.subtasks[0]?.source, "added");
});

test("applyTaskSkill narrows created task tree responses", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, {
    workspaceId,
    projectId,
    taskSkillId,
    taskSkillVersionId,
    taskSkillVersion: 1,
    rootTask: taskDetail,
    subtasks: [
      {
        ...taskDetail,
        id: subtaskId,
        parentTaskId: rootTaskId,
        title: "Strings",
        position: "1",
      },
    ],
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: fetchImplementation,
  });

  const response = await client.applyTaskSkill({
    workspaceId,
    taskSkillId,
    userId,
    body: requestBody,
  });

  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills/${taskSkillId}/apply`,
  );
  assert.equal(response.rootTask.id, rootTaskId);
  assert.equal(response.subtasks[0]?.parentTaskId, rootTaskId);
});

test("backend client maps non-2xx responses to typed errors", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch(
      [],
      { message: "Forbidden" },
      { ok: false, status: 403, statusText: "Forbidden" },
    ),
  });

  await assert.rejects(
    () =>
      client.applyTaskSkill({
        workspaceId,
        taskSkillId,
        userId,
        body: requestBody,
      }),
    (error: unknown): boolean => {
      if (!(error instanceof TaskBackendClientError)) {
        return false;
      }

      assert.equal(error.status, 403);
      assert.deepEqual(error.responseBody, { message: "Forbidden" });
      return true;
    },
  );
});

test("backend client rejects malformed success responses", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch([], {
      workspaceId,
      projectId,
      taskSkillId,
      taskSkillVersionId,
      taskSkillVersion: 1,
      rootTaskTitle: "Intro",
      subtasks: [{ title: "Strings", source: "unexpected" }],
    }),
  });

  await assert.rejects(
    () =>
      client.previewTaskSkillApply({
        workspaceId,
        taskSkillId,
        userId,
        body: requestBody,
      }),
    /subtask source is invalid/,
  );
});

function createJsonFetch(
  calls: { input: string; init: TaskBackendFetchInit }[],
  responseBody: unknown,
  responseInit?: { ok: boolean; status: number; statusText: string },
): TaskBackendFetch {
  return async (input: string, init: TaskBackendFetchInit) => {
    calls.push({ input, init });

    return {
      ok: responseInit?.ok ?? true,
      status: responseInit?.status ?? 200,
      statusText: responseInit?.statusText ?? "OK",
      json: async (): Promise<unknown> => responseBody,
    };
  };
}
