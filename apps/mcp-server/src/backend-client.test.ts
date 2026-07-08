import assert from "node:assert/strict";
import test from "node:test";
import {
  type ConfirmationRequestDetailResponse,
  type ConfirmationRequestSummaryResponse,
  type CreateConfirmationRequestInput,
  createTaskBackendClient,
  type ProjectDetailResponse,
  type ProjectSummaryResponse,
  type TaskAttachmentResponse,
  TaskBackendClientError,
  type TaskBackendFetch,
  type TaskBackendFetchInit,
  type TaskCommentResponse,
  type TaskDetailResponse,
  type TaskSkillDetailResponse,
  type TaskSkillSummaryResponse,
  type TaskSummaryResponse,
  type WorkspaceDetailResponse,
  type WorkspaceMemberResponse,
  type WorkspaceStatusResponse,
  type WorkspaceSummaryResponse,
} from "./backend-client.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const subtaskId = "77777777-7777-4777-8777-777777777777";
const confirmationRequestId = "12121212-1212-4121-8121-121212121212";
const agentRunId = "13131313-1313-4131-8131-131313131313";
const timestamp = "2026-01-01T00:00:00.000Z";

const workspaceSummary: WorkspaceSummaryResponse = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workspaceMember: WorkspaceMemberResponse = {
  id: "88888888-8888-4888-8888-888888888888",
  workspaceId,
  userId,
  role: "admin",
  displayName: "Alex",
  email: "alex@example.com",
  avatarUrl: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workspaceDetail: WorkspaceDetailResponse = {
  ...workspaceSummary,
  members: [workspaceMember],
};

const workspaceStatus: WorkspaceStatusResponse = {
  id: "99999999-9999-4999-8999-999999999999",
  workspaceId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const taskSkillSummary: TaskSkillSummaryResponse = {
  id: taskSkillId,
  workspaceId,
  name: "Song",
  description: "Song production template",
  aliases: ["track"],
  createdByUserId: userId,
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const taskSkillDetail: TaskSkillDetailResponse = {
  ...taskSkillSummary,
  versions: [
    {
      id: taskSkillVersionId,
      workspaceId,
      taskSkillId,
      version: 1,
      definition: {
        subtasks: [{ title: "Lyrics" }],
      },
      createdByUserId: userId,
      createdAt: timestamp,
    },
  ],
};

const createTaskSkillInput = {
  name: " Song ",
  description: " Song production template ",
  aliases: [" track "],
  definition: {
    subtasks: [{ title: "Lyrics" }],
  },
};

const confirmationRequestSummary: ConfirmationRequestSummaryResponse = {
  id: confirmationRequestId,
  workspaceId,
  agentRunId,
  userId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  status: "pending",
  expiresAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const confirmationRequestDetail: ConfirmationRequestDetailResponse = confirmationRequestSummary;

const createConfirmationRequestInput: CreateConfirmationRequestInput = {
  agentRunId,
  kind: "task_skill.apply",
  preview: {
    rootTaskTitle: "Intro",
  },
  expiresAt: timestamp,
};

const taskComment: TaskCommentResponse = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  workspaceId,
  taskId: rootTaskId,
  authorUserId: userId,
  body: "Bass take is ready for review.",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const taskAttachment: TaskAttachmentResponse = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  workspaceId,
  targetType: "task",
  targetId: rootTaskId,
  kind: "link",
  title: "Reference mix",
  url: "https://example.com/reference",
  storageKey: null,
  telegramFileId: null,
  mimeType: null,
  sizeBytes: null,
  createdByUserId: userId,
  createdAt: timestamp,
};

const projectSummary: ProjectSummaryResponse = {
  id: projectId,
  workspaceId,
  title: "Album Release",
  description: null,
  status: "active",
  position: "1000",
  createdByUserId: userId,
  archivedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const projectDetail: ProjectDetailResponse = {
  ...projectSummary,
};

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

const taskSummary: TaskSummaryResponse = {
  ...taskDetail,
};

const taskDetailResponse: TaskDetailResponse = {
  ...taskDetail,
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
  assert.equal(readPostInit(fetchCalls[0]?.init).headers["content-type"], "application/json");
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), requestBody);
  assert.equal(response.subtasks[0]?.source, "added");
});

test("listWorkspaces gets typed workspace summaries with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [workspaceSummary]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listWorkspaces({ userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, "https://api.task.local/workspaces");
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [workspaceSummary]);
});

test("getWorkspace gets typed workspace details with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, workspaceDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.getWorkspace({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, `https://api.task.local/workspaces/${workspaceId}`);
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, workspaceDetail);
});

test("listWorkspaceMembers gets typed workspace members with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [workspaceMember]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listWorkspaceMembers({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, `https://api.task.local/workspaces/${workspaceId}/members`);
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, [workspaceMember]);
});

test("listTaskSkills gets typed task skill summaries with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [taskSkillSummary]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listTaskSkills({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, [taskSkillSummary]);
});

test("getTaskSkill gets typed task skill details with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskSkillDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.getTaskSkill({ workspaceId, taskSkillId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills/${taskSkillId}`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, taskSkillDetail);
});

test("createTaskSkill posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskSkillDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.createTaskSkill({
    workspaceId,
    userId,
    body: createTaskSkillInput,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills`,
  );
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, JSON.stringify(createTaskSkillInput));
  assert.deepEqual(response, taskSkillDetail);
});

test("updateTaskSkillMetadata patches typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const updatedTaskSkill: TaskSkillDetailResponse = {
    ...taskSkillDetail,
    name: "Updated song",
    aliases: ["single"],
  };
  const updateInput = {
    name: "Updated song",
    aliases: ["single"],
  };
  const fetchImplementation = createJsonFetch(fetchCalls, updatedTaskSkill);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.updateTaskSkillMetadata({
    workspaceId,
    taskSkillId,
    userId,
    body: updateInput,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills/${taskSkillId}`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, JSON.stringify(updateInput));
  assert.deepEqual(response, updatedTaskSkill);
});

test("updateTaskSkillDefinition patches typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const updateInput = {
    definition: {
      subtasks: [{ title: "Arrange" }],
    },
  };
  const updatedTaskSkill: TaskSkillDetailResponse = {
    ...taskSkillDetail,
    versions: [
      {
        id: taskSkillVersionId,
        workspaceId,
        taskSkillId,
        version: 2,
        definition: updateInput.definition,
        createdByUserId: userId,
        createdAt: timestamp,
      },
    ],
  };
  const fetchImplementation = createJsonFetch(fetchCalls, updatedTaskSkill);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.updateTaskSkillDefinition({
    workspaceId,
    taskSkillId,
    userId,
    body: updateInput,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/task-skills/${taskSkillId}/definition`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, JSON.stringify(updateInput));
  assert.deepEqual(response, updatedTaskSkill);
});

test("listPendingConfirmationRequests gets typed confirmations with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [confirmationRequestSummary]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listPendingConfirmationRequests({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/confirmations`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, [confirmationRequestSummary]);
});

test("getConfirmationRequest gets one typed confirmation with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, confirmationRequestDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.getConfirmationRequest({
    workspaceId,
    confirmationRequestId,
    userId,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/confirmations/${confirmationRequestId}`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, confirmationRequestDetail);
});

test("createConfirmationRequest posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, confirmationRequestDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.createConfirmationRequest({
    workspaceId,
    userId,
    body: createConfirmationRequestInput,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/confirmations`,
  );
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, JSON.stringify(createConfirmationRequestInput));
  assert.deepEqual(response, confirmationRequestDetail);
});

test("cancelConfirmationRequest patches one pending confirmation with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const cancelledConfirmation: ConfirmationRequestDetailResponse = {
    ...confirmationRequestDetail,
    status: "cancelled",
  };
  const fetchImplementation = createJsonFetch(fetchCalls, cancelledConfirmation);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.cancelConfirmationRequest({
    workspaceId,
    confirmationRequestId,
    userId,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/confirmations/${confirmationRequestId}/cancel`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, "{}");
  assert.deepEqual(response, cancelledConfirmation);
});

test("confirmConfirmationRequest patches one pending confirmation with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const confirmedConfirmation: ConfirmationRequestDetailResponse = {
    ...confirmationRequestDetail,
    status: "confirmed",
  };
  const fetchImplementation = createJsonFetch(fetchCalls, confirmedConfirmation);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.confirmConfirmationRequest({
    workspaceId,
    confirmationRequestId,
    userId,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/confirmations/${confirmationRequestId}/confirm`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers["content-type"], "application/json");
  assert.equal(fetchCalls[0]?.init.body, "{}");
  assert.deepEqual(response, confirmedConfirmation);
});

test("listActiveProjects gets typed project summaries with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [projectSummary]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listActiveProjects({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, `https://api.task.local/workspaces/${workspaceId}/projects`);
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [projectSummary]);
});

test("listWorkspaceStatuses gets typed workspace statuses with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [workspaceStatus]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listWorkspaceStatuses({ workspaceId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, `https://api.task.local/workspaces/${workspaceId}/statuses`);
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [workspaceStatus]);
});

test("getProject gets typed project detail with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, projectDetail);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.getProject({ workspaceId, projectId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, projectDetail);
});

test("createProject posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, projectDetail, {
    ok: true,
    status: 201,
    statusText: "Created",
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    title: "Album Release",
    description: "Release plan",
    status: "active",
    position: "1000",
  };

  const response = await client.createProject({ workspaceId, userId, body });

  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.input, `https://api.task.local/workspaces/${workspaceId}/projects`);
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, projectDetail);
});

test("listActiveTasks gets typed task summaries with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [taskSummary]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listActiveTasks({ workspaceId, projectId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [taskSummary]);
});

test("listTaskComments gets typed task comments with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [taskComment]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listTaskComments({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/comments`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [taskComment]);
});

test("createTaskComment posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskComment, {
    ok: true,
    status: 201,
    statusText: "Created",
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    body: "Bass take is ready for review.",
  };

  const response = await client.createTaskComment({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/comments`,
  );
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskComment);
});

test("listTaskAttachments gets typed task attachments with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, [taskAttachment]);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.listTaskAttachments({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/attachments`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.equal(fetchCalls[0]?.init.headers.accept, "application/json");
  assert.deepEqual(response, [taskAttachment]);
});

test("createTaskLinkAttachment posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskAttachment, {
    ok: true,
    status: 201,
    statusText: "Created",
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    url: "https://example.com/reference",
    title: "Reference mix",
  };

  const response = await client.createTaskLinkAttachment({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/attachments/links`,
  );
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskAttachment);
});

test("getTask gets typed task detail with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskDetailResponse);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });

  const response = await client.getTask({ workspaceId, projectId, taskId: rootTaskId, userId });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}`,
  );
  assert.equal(fetchCalls[0]?.init.method, "GET");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(response, taskDetailResponse);
});

test("createTask posts typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskDetailResponse, {
    ok: true,
    status: 201,
    statusText: "Created",
  });
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    title: "Intro",
    parentTaskId: null,
    description: "Opening section",
    position: "1000",
    dueAt: timestamp,
    metadata: { source: "manual" },
  };

  const response = await client.createTask({ workspaceId, projectId, userId, body });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks`,
  );
  assert.equal(fetchCalls[0]?.init.method, "POST");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskDetailResponse);
});

test("updateTaskStatus patches typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskDetailResponse);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    statusId: null,
  };

  const response = await client.updateTaskStatus({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/status`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskDetailResponse);
});

test("updateTaskAssignee patches typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskDetailResponse);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    assigneeUserId: null,
  };

  const response = await client.updateTaskAssignee({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/assignee`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskDetailResponse);
});

test("updateTaskDueDate patches typed payloads with trusted user context", async () => {
  const fetchCalls: { input: string; init: TaskBackendFetchInit }[] = [];
  const fetchImplementation = createJsonFetch(fetchCalls, taskDetailResponse);
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local/",
    fetch: fetchImplementation,
  });
  const body = {
    dueAt: timestamp,
  };

  const response = await client.updateTaskDueDate({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body,
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(
    fetchCalls[0]?.input,
    `https://api.task.local/workspaces/${workspaceId}/projects/${projectId}/tasks/${rootTaskId}/due-date`,
  );
  assert.equal(fetchCalls[0]?.init.method, "PATCH");
  assert.equal(fetchCalls[0]?.init.headers["x-task-user-id"], userId);
  assert.deepEqual(readJsonBody(fetchCalls[0]?.init), body);
  assert.deepEqual(response, taskDetailResponse);
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

test("backend client rejects malformed project list responses", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch([], [{ ...projectSummary, title: null }]),
  });

  await assert.rejects(
    () => client.listActiveProjects({ workspaceId, userId }),
    /title must be a string/,
  );
});

test("backend client rejects malformed status list responses", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch([], [{ ...workspaceStatus, isDone: "false" }]),
  });

  await assert.rejects(
    () => client.listWorkspaceStatuses({ workspaceId, userId }),
    /isDone must be a boolean/,
  );
});

test("backend client rejects malformed task list responses", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch([], [{ ...taskSummary, metadata: null }]),
  });

  await assert.rejects(
    () => client.listActiveTasks({ workspaceId, projectId, userId }),
    /task metadata must be an object/,
  );
});

test("backend client rejects malformed task comment list responses", async () => {
  const client = createTaskBackendClient({
    baseUrl: "https://api.task.local",
    fetch: createJsonFetch([], [{ ...taskComment, body: null }]),
  });

  await assert.rejects(
    () => client.listTaskComments({ workspaceId, projectId, taskId: rootTaskId, userId }),
    /body must be a string/,
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

function readJsonBody(init: TaskBackendFetchInit | undefined): unknown {
  return JSON.parse(readWriteInit(init).body);
}

function readPostInit(
  init: TaskBackendFetchInit | undefined,
): Extract<TaskBackendFetchInit, { method: "POST" }> {
  if (init?.method !== "POST") {
    throw new Error("Expected POST fetch init.");
  }

  return init;
}

function readWriteInit(
  init: TaskBackendFetchInit | undefined,
): Extract<TaskBackendFetchInit, { method: "POST" | "PATCH" }> {
  if (init?.method !== "POST" && init?.method !== "PATCH") {
    throw new Error("Expected write fetch init.");
  }

  return init;
}
