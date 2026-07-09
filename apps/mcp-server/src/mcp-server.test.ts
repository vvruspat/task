import assert from "node:assert/strict";
import test from "node:test";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  ApplyTaskSkillResponse,
  ArchiveProjectRequest,
  ArchiveTaskRequest,
  ConfirmationRequestDetailResponse,
  ConfirmationRequestSummaryResponse,
  CreateProjectRequest,
  CreateTaskLinkAttachmentRequest,
  CreateTaskRequest,
  GetWorkspaceRequest,
  ListTaskAttachmentsRequest,
  ListWorkspaceMembersRequest,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSkillApplyRequest,
  TaskSkillDetailResponse,
  TaskSkillSummaryResponse,
  TaskSummaryResponse,
  UpdateProjectRequest,
  UpdateTaskAssigneeRequest,
  UpdateTaskDueDateRequest,
  UpdateTaskStatusRequest,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceStatusResponse,
  WorkspaceSummaryResponse,
} from "./backend-client.js";
import {
  createTaskMcpServer,
  registerAttachmentTools,
  registerCommentTools,
  registerConfirmationTools,
  registerProjectTools,
  registerStatusTools,
  registerTaskSkillApplyTools,
  registerTaskTools,
  registerWorkspaceTools,
  type TaskMcpToolRegistrar,
} from "./mcp-server.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const statusId = "88888888-8888-4888-8888-888888888888";
const assigneeUserId = "99999999-9999-4999-8999-999999999999";
const timestamp = "2026-01-01T00:00:00.000Z";
const dueAt = "2026-01-03T12:00:00.000Z";
const commentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const confirmationRequestId = "12121212-1212-4121-8121-121212121212";
const agentRunId = "13131313-1313-4131-8131-131313131313";

const workspaceResponse: WorkspaceSummaryResponse = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workspaceMemberResponse: WorkspaceMemberResponse = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  workspaceId,
  userId,
  role: "admin",
  displayName: "Alex",
  email: "alex@example.com",
  avatarUrl: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const workspaceDetailResponse: WorkspaceDetailResponse = {
  ...workspaceResponse,
  members: [workspaceMemberResponse],
};

const toolInput = {
  workspaceId,
  taskSkillId,
  userId,
  projectId,
  rootTaskTitle: "Intro",
};

const previewResponse: PreviewTaskSkillApplyResponse = {
  workspaceId,
  projectId,
  taskSkillId,
  taskSkillVersionId,
  taskSkillVersion: 1,
  rootTaskTitle: "Intro",
  subtasks: [{ title: "Lyrics", source: "skill" }],
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

const projectResponse: ProjectSummaryResponse = {
  id: projectId,
  workspaceId,
  title: "Album Release",
  createdByUserId: userId,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const projectDetailResponse: ProjectDetailResponse = {
  ...projectResponse,
};

const statusResponse: WorkspaceStatusResponse = {
  id: statusId,
  workspaceId,
  name: "In progress",
  color: "#3b82f6",
  position: "1000",
  isDone: false,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const taskSkillResponse: TaskSkillSummaryResponse = {
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

const taskSkillDetailResponse: TaskSkillDetailResponse = {
  ...taskSkillResponse,
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

const confirmationRequestResponse: ConfirmationRequestDetailResponse = {
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

const commentResponse: TaskCommentResponse = {
  id: commentId,
  workspaceId,
  taskId: rootTaskId,
  authorUserId: userId,
  body: "Bass take is ready for review.",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const attachmentResponse: TaskAttachmentResponse = {
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

const taskResponse: TaskSummaryResponse = {
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

test("registerWorkspaceTools registers workspace context tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const getCurrentCalls: GetWorkspaceRequest[] = [];
  const memberCalls: ListWorkspaceMembersRequest[] = [];
  const registrar = createRegistrar(toolCalls);

  registerWorkspaceTools(registrar, {
    getCurrent: async (input: unknown): Promise<WorkspaceDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected workspace get current input.");
      }
      getCurrentCalls.push({
        workspaceId: readString(input, "workspaceId"),
        userId: readString(input, "userId"),
      });
      return workspaceDetailResponse;
    },
    listMembers: async (input: unknown): Promise<WorkspaceMemberResponse[]> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected workspace member list input.");
      }
      memberCalls.push({
        workspaceId: readString(input, "workspaceId"),
        userId: readString(input, "userId"),
      });
      return [workspaceMemberResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    ["workspace.get_current", "user.list_workspace_members"],
  );
  assert.equal(toolCalls[0]?.config.title, "Get current workspace");
  assert.equal(toolCalls[1]?.config.title, "List workspace members");

  const getCurrentCall = toolCalls[0];
  assert.ok(getCurrentCall !== undefined);
  const getCurrentResult = await getCurrentCall.callback({
    workspaceId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(getCurrentResult)), workspaceDetailResponse);
  assert.deepEqual(getCurrentCalls, [{ workspaceId, userId }]);

  const memberCall = toolCalls[1];
  assert.ok(memberCall !== undefined);
  const memberResult = await memberCall.callback({
    workspaceId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(memberResult)), [workspaceMemberResponse]);
  assert.deepEqual(memberCalls, [{ workspaceId, userId }]);
});

test("registerProjectTools registers project tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const createCalls: CreateProjectRequest[] = [];
  const archiveCalls: ArchiveProjectRequest[] = [];
  const updateCalls: UpdateProjectRequest[] = [];
  const registrar = createRegistrar(toolCalls);

  registerProjectTools(registrar, {
    create: async (input: unknown): Promise<ProjectDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected project create input.");
      }
      createCalls.push({
        workspaceId: readString(input, "workspaceId"),
        userId: readString(input, "userId"),
        body: {
          title: readString(input, "title"),
        },
      });
      return projectDetailResponse;
    },
    get: async (input: unknown): Promise<ProjectDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        projectId,
        userId,
      });
      return projectDetailResponse;
    },
    archive: async (input: unknown): Promise<ProjectDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected project archive input.");
      }
      archiveCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        userId: readString(input, "userId"),
      });
      return {
        ...projectDetailResponse,
        archivedAt: timestamp,
      };
    },
    update: async (input: unknown): Promise<ProjectDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected project update input.");
      }
      updateCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        userId: readString(input, "userId"),
        body: {
          title: readString(input, "title"),
        },
      });
      return projectDetailResponse;
    },
    search: async (input: unknown): Promise<ProjectSummaryResponse[]> => {
      assert.deepEqual(input, {
        workspaceId,
        userId,
        query: "album",
      });
      return [projectResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    ["project.create", "project.get", "project.archive", "project.update", "project.search"],
  );
  assert.equal(toolCalls[0]?.config.title, "Create project");
  assert.equal(toolCalls[1]?.config.title, "Get project");
  assert.equal(toolCalls[2]?.config.title, "Archive project");
  assert.equal(toolCalls[3]?.config.title, "Update project");
  assert.equal(toolCalls[4]?.config.title, "Search projects");

  const createCall = toolCalls[0];
  assert.ok(createCall !== undefined);
  const createResult = await createCall.callback({
    workspaceId,
    userId,
    title: "Album Release",
  });

  assert.deepEqual(JSON.parse(readTextResult(createResult)), projectDetailResponse);
  assert.deepEqual(createCalls, [
    {
      workspaceId,
      userId,
      body: {
        title: "Album Release",
      },
    },
  ]);

  const getCall = toolCalls[1];
  assert.ok(getCall !== undefined);
  const getResult = await getCall.callback({
    workspaceId,
    projectId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(getResult)), projectDetailResponse);

  const archiveCall = toolCalls[2];
  assert.ok(archiveCall !== undefined);
  const archiveResult = await archiveCall.callback({
    workspaceId,
    projectId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(archiveResult)), {
    ...projectDetailResponse,
    archivedAt: timestamp,
  });
  assert.deepEqual(archiveCalls, [{ workspaceId, projectId, userId }]);

  const updateCall = toolCalls[3];
  assert.ok(updateCall !== undefined);
  const updateResult = await updateCall.callback({
    workspaceId,
    projectId,
    userId,
    title: "Updated Release",
  });

  assert.deepEqual(JSON.parse(readTextResult(updateResult)), projectDetailResponse);
  assert.deepEqual(updateCalls, [
    {
      workspaceId,
      projectId,
      userId,
      body: {
        title: "Updated Release",
      },
    },
  ]);

  const searchCall = toolCalls[4];
  assert.ok(searchCall !== undefined);
  const searchResult = await searchCall.callback({
    workspaceId,
    userId,
    query: "album",
  });

  assert.deepEqual(JSON.parse(readTextResult(searchResult)), [projectResponse]);
});

test("registerStatusTools registers status tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const listCalls: Array<{ workspaceId: string; userId: string }> = [];
  const registrar = createRegistrar(toolCalls);

  registerStatusTools(registrar, {
    list: async (input: unknown): Promise<WorkspaceStatusResponse[]> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected status list input.");
      }
      listCalls.push({
        workspaceId: readString(input, "workspaceId"),
        userId: readString(input, "userId"),
      });
      return [statusResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    ["status.list"],
  );
  assert.equal(toolCalls[0]?.config.title, "List statuses");

  const listCall = toolCalls[0];
  assert.ok(listCall !== undefined);
  const listResult = await listCall.callback({
    workspaceId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(listResult)), [statusResponse]);
  assert.deepEqual(listCalls, [{ workspaceId, userId }]);
});

test("registerCommentTools registers comment tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const listCalls: Array<{
    workspaceId: string;
    projectId: string;
    taskId: string;
    userId: string;
  }> = [];
  const createCalls: Array<{
    workspaceId: string;
    projectId: string;
    taskId: string;
    userId: string;
    body: {
      body: string;
    };
  }> = [];
  const registrar = createRegistrar(toolCalls);

  registerCommentTools(registrar, {
    create: async (input: unknown): Promise<TaskCommentResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected comment create input.");
      }
      createCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
        body: {
          body: readString(input, "body"),
        },
      });
      return commentResponse;
    },
    list: async (input: unknown): Promise<TaskCommentResponse[]> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected comment list input.");
      }
      listCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
      });
      return [commentResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    ["comment.create", "comment.list"],
  );
  assert.equal(toolCalls[0]?.config.title, "Create comment");
  assert.equal(toolCalls[1]?.config.title, "List comments");

  const createCall = toolCalls[0];
  assert.ok(createCall !== undefined);
  const createResult = await createCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    body: "Bass take is ready for review.",
  });

  assert.deepEqual(JSON.parse(readTextResult(createResult)), commentResponse);
  assert.deepEqual(createCalls, [
    {
      workspaceId,
      projectId,
      taskId: rootTaskId,
      userId,
      body: {
        body: "Bass take is ready for review.",
      },
    },
  ]);

  const listCall = toolCalls[1];
  assert.ok(listCall !== undefined);
  const listResult = await listCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(listResult)), [commentResponse]);
  assert.deepEqual(listCalls, [{ workspaceId, projectId, taskId: rootTaskId, userId }]);
});

test("registerAttachmentTools registers attachment tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const listCalls: ListTaskAttachmentsRequest[] = [];
  const createLinkCalls: CreateTaskLinkAttachmentRequest[] = [];
  const registrar = createRegistrar(toolCalls);

  registerAttachmentTools(registrar, {
    createLink: async (input: unknown): Promise<TaskAttachmentResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected attachment create link input.");
      }
      createLinkCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
        body: {
          url: readString(input, "url"),
          title: readNullableString(input, "title"),
        },
      });
      return attachmentResponse;
    },
    list: async (input: unknown): Promise<TaskAttachmentResponse[]> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected attachment list input.");
      }
      listCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
      });
      return [attachmentResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    ["attachment.create_link", "attachment.list"],
  );
  assert.equal(toolCalls[0]?.config.title, "Create link attachment");
  assert.equal(toolCalls[1]?.config.title, "List attachments");

  const createLinkCall = toolCalls[0];
  assert.ok(createLinkCall !== undefined);
  const createLinkResult = await createLinkCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    url: "https://example.com/reference",
    title: "Reference mix",
  });

  assert.deepEqual(JSON.parse(readTextResult(createLinkResult)), attachmentResponse);
  assert.deepEqual(createLinkCalls, [
    {
      workspaceId,
      projectId,
      taskId: rootTaskId,
      userId,
      body: {
        url: "https://example.com/reference",
        title: "Reference mix",
      },
    },
  ]);

  const listCall = toolCalls[1];
  assert.ok(listCall !== undefined);
  const listResult = await listCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(listResult)), [attachmentResponse]);
  assert.deepEqual(listCalls, [{ workspaceId, projectId, taskId: rootTaskId, userId }]);
});

test("registerTaskTools registers task tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const createCalls: CreateTaskRequest[] = [];
  const statusCalls: UpdateTaskStatusRequest[] = [];
  const assigneeCalls: UpdateTaskAssigneeRequest[] = [];
  const dueDateCalls: UpdateTaskDueDateRequest[] = [];
  const archiveCalls: ArchiveTaskRequest[] = [];
  const registrar = createRegistrar(toolCalls);

  registerTaskTools(registrar, {
    create: async (input: unknown): Promise<TaskDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected task create input.");
      }
      createCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        userId: readString(input, "userId"),
        body: {
          title: readString(input, "title"),
        },
      });
      return taskResponse;
    },
    setStatus: async (input: unknown): Promise<TaskDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected task status input.");
      }
      statusCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
        body: {
          statusId: null,
        },
      });
      return taskResponse;
    },
    setAssignee: async (input: unknown): Promise<TaskDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected task assignee input.");
      }
      assigneeCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
        body: {
          assigneeUserId: readNullableString(input, "assigneeUserId"),
        },
      });
      return taskResponse;
    },
    setDueDate: async (input: unknown): Promise<TaskDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected task due date input.");
      }
      dueDateCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
        body: {
          dueAt: readNullableString(input, "dueAt"),
        },
      });
      return taskResponse;
    },
    get: async (input: unknown): Promise<TaskDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        projectId,
        taskId: rootTaskId,
        userId,
      });
      return taskResponse;
    },
    archive: async (input: unknown): Promise<TaskDetailResponse> => {
      if (!isUnknownRecord(input)) {
        throw new Error("Expected task archive input.");
      }
      archiveCalls.push({
        workspaceId: readString(input, "workspaceId"),
        projectId: readString(input, "projectId"),
        taskId: readString(input, "taskId"),
        userId: readString(input, "userId"),
      });
      return {
        ...taskResponse,
        archivedAt: timestamp,
      };
    },
    search: async (input: unknown): Promise<TaskSummaryResponse[]> => {
      assert.deepEqual(input, {
        workspaceId,
        projectId,
        userId,
        query: "intro",
      });
      return [taskResponse];
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    [
      "task.create",
      "task.set_status",
      "task.set_assignee",
      "task.set_due_date",
      "task.get",
      "task.archive",
      "task.search",
    ],
  );
  assert.equal(toolCalls[0]?.config.title, "Create task");
  assert.equal(toolCalls[1]?.config.title, "Set task status");
  assert.equal(toolCalls[2]?.config.title, "Set task assignee");
  assert.equal(toolCalls[3]?.config.title, "Set task due date");
  assert.equal(toolCalls[4]?.config.title, "Get task");
  assert.equal(toolCalls[5]?.config.title, "Archive task");
  assert.equal(toolCalls[6]?.config.title, "Search tasks");

  const createCall = toolCalls[0];
  assert.ok(createCall !== undefined);
  const createResult = await createCall.callback({
    workspaceId,
    projectId,
    userId,
    title: "Intro",
  });

  assert.deepEqual(JSON.parse(readTextResult(createResult)), taskResponse);
  assert.deepEqual(createCalls, [
    {
      workspaceId,
      projectId,
      userId,
      body: {
        title: "Intro",
      },
    },
  ]);

  const statusCall = toolCalls[1];
  assert.ok(statusCall !== undefined);
  const statusResult = await statusCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    statusId: null,
  });

  assert.deepEqual(JSON.parse(readTextResult(statusResult)), taskResponse);
  assert.deepEqual(statusCalls, [
    {
      workspaceId,
      projectId,
      taskId: rootTaskId,
      userId,
      body: {
        statusId: null,
      },
    },
  ]);

  const assigneeCall = toolCalls[2];
  assert.ok(assigneeCall !== undefined);
  const assigneeResult = await assigneeCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    assigneeUserId,
  });

  assert.deepEqual(JSON.parse(readTextResult(assigneeResult)), taskResponse);
  assert.deepEqual(assigneeCalls, [
    {
      workspaceId,
      projectId,
      taskId: rootTaskId,
      userId,
      body: {
        assigneeUserId,
      },
    },
  ]);

  const dueDateCall = toolCalls[3];
  assert.ok(dueDateCall !== undefined);
  const dueDateResult = await dueDateCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
    dueAt,
  });

  assert.deepEqual(JSON.parse(readTextResult(dueDateResult)), taskResponse);
  assert.deepEqual(dueDateCalls, [
    {
      workspaceId,
      projectId,
      taskId: rootTaskId,
      userId,
      body: {
        dueAt,
      },
    },
  ]);

  const getCall = toolCalls[4];
  assert.ok(getCall !== undefined);
  const getResult = await getCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(getResult)), taskResponse);

  const archiveCall = toolCalls[5];
  assert.ok(archiveCall !== undefined);
  const archiveResult = await archiveCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(archiveResult)), {
    ...taskResponse,
    archivedAt: timestamp,
  });
  assert.deepEqual(archiveCalls, [{ workspaceId, projectId, taskId: rootTaskId, userId }]);

  const searchCall = toolCalls[6];
  assert.ok(searchCall !== undefined);
  const searchResult = await searchCall.callback({
    workspaceId,
    projectId,
    userId,
    query: "intro",
  });

  assert.deepEqual(JSON.parse(readTextResult(searchResult)), [taskResponse]);
});

test("registerTaskSkillApplyTools registers preview and apply tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const backendCalls: TaskSkillApplyRequest[] = [];
  const registrar = createRegistrar(toolCalls);

  registerTaskSkillApplyTools(registrar, {
    search: async (input: unknown): Promise<TaskSkillSummaryResponse[]> => {
      assert.deepEqual(input, {
        workspaceId,
        userId,
        query: "song",
      });
      return [taskSkillResponse];
    },
    get: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        taskSkillId,
        userId,
      });
      return taskSkillDetailResponse;
    },
    create: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        userId,
        name: "Song",
        description: "Song production template",
        aliases: ["track"],
        definition: {
          subtasks: [{ title: "Lyrics" }],
        },
      });
      return taskSkillDetailResponse;
    },
    clone: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        taskSkillId,
        userId,
        name: "Song copy",
        description: null,
        aliases: ["copy"],
      });
      return {
        ...taskSkillDetailResponse,
        id: "88888888-8888-4888-8888-888888888888",
        name: "Song copy",
        description: null,
        aliases: ["copy"],
      };
    },
    archive: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        taskSkillId,
        userId,
      });
      return {
        ...taskSkillDetailResponse,
        archivedAt: timestamp,
      };
    },
    updateMetadata: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        taskSkillId,
        userId,
        name: "Updated song",
        aliases: ["single"],
      });
      return {
        ...taskSkillDetailResponse,
        name: "Updated song",
        aliases: ["single"],
      };
    },
    updateDefinition: async (input: unknown): Promise<TaskSkillDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        taskSkillId,
        userId,
        definition: {
          subtasks: [{ title: "Arrange" }],
        },
      });
      return taskSkillDetailResponse;
    },
    previewApply: async (input: unknown): Promise<PreviewTaskSkillApplyResponse> => {
      backendCalls.push(readBackendRequestInput(input));
      return previewResponse;
    },
    apply: async (input: unknown): Promise<ApplyTaskSkillResponse> => {
      backendCalls.push(readBackendRequestInput(input));
      return applyResponse;
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    [
      "skill.search",
      "skill.get",
      "skill.create",
      "skill.clone",
      "skill.archive",
      "skill.update_metadata",
      "skill.update_definition",
      "skill.preview_apply",
      "skill.apply",
    ],
  );
  assert.equal(toolCalls[0]?.config.title, "Search task skills");
  assert.equal(toolCalls[1]?.config.title, "Get task skill");
  assert.equal(toolCalls[2]?.config.title, "Create task skill");
  assert.equal(toolCalls[3]?.config.title, "Clone task skill");
  assert.equal(toolCalls[4]?.config.title, "Archive task skill");
  assert.equal(toolCalls[5]?.config.title, "Update task skill metadata");
  assert.equal(toolCalls[6]?.config.title, "Update task skill definition");
  assert.equal(toolCalls[7]?.config.title, "Preview task skill application");
  assert.equal(toolCalls[8]?.config.title, "Apply task skill");

  const previewCall = toolCalls[0];
  assert.ok(previewCall !== undefined);
  const searchResult = await previewCall.callback({
    workspaceId,
    userId,
    query: "song",
  });

  assert.deepEqual(JSON.parse(readTextResult(searchResult)), [taskSkillResponse]);

  const getCall = toolCalls[1];
  assert.ok(getCall !== undefined);
  const getResult = await getCall.callback({
    workspaceId,
    taskSkillId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(getResult)), taskSkillDetailResponse);

  const createCall = toolCalls[2];
  assert.ok(createCall !== undefined);
  const createResult = await createCall.callback({
    workspaceId,
    userId,
    name: "Song",
    description: "Song production template",
    aliases: ["track"],
    definition: {
      subtasks: [{ title: "Lyrics" }],
    },
  });

  assert.deepEqual(JSON.parse(readTextResult(createResult)), taskSkillDetailResponse);

  const cloneCall = toolCalls[3];
  assert.ok(cloneCall !== undefined);
  const cloneResult = await cloneCall.callback({
    workspaceId,
    taskSkillId,
    userId,
    name: "Song copy",
    description: null,
    aliases: ["copy"],
  });

  assert.deepEqual(JSON.parse(readTextResult(cloneResult)), {
    ...taskSkillDetailResponse,
    id: "88888888-8888-4888-8888-888888888888",
    name: "Song copy",
    description: null,
    aliases: ["copy"],
  });

  const archiveCall = toolCalls[4];
  assert.ok(archiveCall !== undefined);
  const archiveResult = await archiveCall.callback({
    workspaceId,
    taskSkillId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(archiveResult)), {
    ...taskSkillDetailResponse,
    archivedAt: timestamp,
  });

  const updateMetadataCall = toolCalls[5];
  assert.ok(updateMetadataCall !== undefined);
  const updateMetadataResult = await updateMetadataCall.callback({
    workspaceId,
    taskSkillId,
    userId,
    name: "Updated song",
    aliases: ["single"],
  });

  assert.deepEqual(JSON.parse(readTextResult(updateMetadataResult)), {
    ...taskSkillDetailResponse,
    name: "Updated song",
    aliases: ["single"],
  });

  const updateDefinitionCall = toolCalls[6];
  assert.ok(updateDefinitionCall !== undefined);
  const updateDefinitionResult = await updateDefinitionCall.callback({
    workspaceId,
    taskSkillId,
    userId,
    definition: {
      subtasks: [{ title: "Arrange" }],
    },
  });

  assert.deepEqual(JSON.parse(readTextResult(updateDefinitionResult)), taskSkillDetailResponse);

  const previewApplyCall = toolCalls[7];
  assert.ok(previewApplyCall !== undefined);
  const previewResult = await previewApplyCall.callback(toolInput);

  assert.deepEqual(JSON.parse(readTextResult(previewResult)), previewResponse);
  assert.deepEqual(backendCalls[0], {
    workspaceId,
    taskSkillId,
    userId,
    body: {
      projectId,
      rootTaskTitle: "Intro",
    },
  });

  const applyCall = toolCalls[8];
  assert.ok(applyCall !== undefined);
  const applyResult = await applyCall.callback(toolInput);

  assert.deepEqual(JSON.parse(readTextResult(applyResult)), applyResponse);
});

test("registerConfirmationTools registers confirmation request tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const registrar = createRegistrar(toolCalls);
  const cancelledResponse: ConfirmationRequestDetailResponse = {
    ...confirmationRequestResponse,
    status: "cancelled",
  };
  const confirmedResponse: ConfirmationRequestDetailResponse = {
    ...confirmationRequestResponse,
    status: "confirmed",
  };

  registerConfirmationTools(registrar, {
    listPending: async (input: unknown): Promise<ConfirmationRequestSummaryResponse[]> => {
      assert.deepEqual(input, { workspaceId, userId });
      return [confirmationRequestResponse];
    },
    get: async (input: unknown): Promise<ConfirmationRequestDetailResponse> => {
      assert.deepEqual(input, { workspaceId, confirmationRequestId, userId });
      return confirmationRequestResponse;
    },
    create: async (input: unknown): Promise<ConfirmationRequestDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        userId,
        agentRunId,
        kind: "task_skill.apply",
        preview: {
          rootTaskTitle: "Intro",
        },
        expiresAt: timestamp,
      });
      return confirmationRequestResponse;
    },
    cancel: async (input: unknown): Promise<ConfirmationRequestDetailResponse> => {
      assert.deepEqual(input, { workspaceId, confirmationRequestId, userId });
      return cancelledResponse;
    },
    commit: async (input: unknown): Promise<ConfirmationRequestDetailResponse> => {
      assert.deepEqual(input, { workspaceId, confirmationRequestId, userId });
      return confirmedResponse;
    },
  });

  assert.deepEqual(
    toolCalls.map((call) => call.name),
    [
      "confirmation.list_pending",
      "confirmation.get",
      "confirmation.create",
      "confirmation.cancel",
      "confirmation.commit",
    ],
  );
  assert.equal(toolCalls[0]?.config.title, "List pending confirmations");
  assert.equal(toolCalls[1]?.config.title, "Get confirmation");
  assert.equal(toolCalls[2]?.config.title, "Create confirmation");
  assert.equal(toolCalls[3]?.config.title, "Cancel confirmation");
  assert.equal(toolCalls[4]?.config.title, "Commit confirmation");

  const listCall = toolCalls[0];
  assert.ok(listCall !== undefined);
  assert.deepEqual(JSON.parse(readTextResult(await listCall.callback({ workspaceId, userId }))), [
    confirmationRequestResponse,
  ]);

  const getCall = toolCalls[1];
  assert.ok(getCall !== undefined);
  assert.deepEqual(
    JSON.parse(
      readTextResult(await getCall.callback({ workspaceId, confirmationRequestId, userId })),
    ),
    confirmationRequestResponse,
  );

  const createCall = toolCalls[2];
  assert.ok(createCall !== undefined);
  assert.deepEqual(
    JSON.parse(
      readTextResult(
        await createCall.callback({
          workspaceId,
          userId,
          agentRunId,
          kind: "task_skill.apply",
          preview: {
            rootTaskTitle: "Intro",
          },
          expiresAt: timestamp,
        }),
      ),
    ),
    confirmationRequestResponse,
  );

  const cancelCall = toolCalls[3];
  assert.ok(cancelCall !== undefined);
  assert.deepEqual(
    JSON.parse(
      readTextResult(await cancelCall.callback({ workspaceId, confirmationRequestId, userId })),
    ),
    cancelledResponse,
  );

  const commitCall = toolCalls[4];
  assert.ok(commitCall !== undefined);
  assert.deepEqual(
    JSON.parse(
      readTextResult(await commitCall.callback({ workspaceId, confirmationRequestId, userId })),
    ),
    confirmedResponse,
  );
});

test("createTaskMcpServer returns an MCP server with task skill tools registered", () => {
  const server = createTaskMcpServer({
    backendClient: createBackendClientStub(),
    name: "test-task-mcp",
    version: "1.0.0",
  });

  assert.equal(server.isConnected(), false);
});

type RegisteredToolCall = {
  name: string;
  config: Parameters<TaskMcpToolRegistrar["registerTool"]>[1];
  callback: Parameters<TaskMcpToolRegistrar["registerTool"]>[2];
};

function createRegistrar(calls: RegisteredToolCall[]): TaskMcpToolRegistrar {
  return {
    registerTool: (name, config, callback): unknown => {
      calls.push({ name, config, callback });
      return undefined;
    },
  };
}

function createBackendClientStub(): TaskBackendClient {
  return {
    listWorkspaces: async (): Promise<WorkspaceSummaryResponse[]> => [workspaceResponse],
    getWorkspace: async (): Promise<WorkspaceDetailResponse> => workspaceDetailResponse,
    listWorkspaceMembers: async (): Promise<WorkspaceMemberResponse[]> => [workspaceMemberResponse],
    listWorkspaceStatuses: async (): Promise<WorkspaceStatusResponse[]> => [statusResponse],
    listPendingConfirmationRequests: async (): Promise<ConfirmationRequestSummaryResponse[]> => [
      confirmationRequestResponse,
    ],
    getConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> =>
      confirmationRequestResponse,
    createConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> =>
      confirmationRequestResponse,
    cancelConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> => ({
      ...confirmationRequestResponse,
      status: "cancelled",
    }),
    confirmConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> => ({
      ...confirmationRequestResponse,
      status: "confirmed",
    }),
    listTaskSkills: async (): Promise<TaskSkillSummaryResponse[]> => [taskSkillResponse],
    getTaskSkill: async (): Promise<TaskSkillDetailResponse> => taskSkillDetailResponse,
    createTaskSkill: async (): Promise<TaskSkillDetailResponse> => taskSkillDetailResponse,
    cloneTaskSkill: async (): Promise<TaskSkillDetailResponse> => ({
      ...taskSkillDetailResponse,
      id: "88888888-8888-4888-8888-888888888888",
      name: "Song copy",
    }),
    archiveTaskSkill: async (): Promise<TaskSkillDetailResponse> => ({
      ...taskSkillDetailResponse,
      archivedAt: timestamp,
    }),
    updateTaskSkillMetadata: async (): Promise<TaskSkillDetailResponse> => taskSkillDetailResponse,
    updateTaskSkillDefinition: async (): Promise<TaskSkillDetailResponse> =>
      taskSkillDetailResponse,
    listTaskComments: async (): Promise<TaskCommentResponse[]> => [commentResponse],
    createTaskComment: async (): Promise<TaskCommentResponse> => commentResponse,
    listTaskAttachments: async (): Promise<TaskAttachmentResponse[]> => [attachmentResponse],
    createTaskLinkAttachment: async (): Promise<TaskAttachmentResponse> => attachmentResponse,
    archiveProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    updateProject: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createProject: async (): Promise<ProjectDetailResponse> => projectDetailResponse,
    getProject: async (): Promise<ProjectDetailResponse> => projectDetailResponse,
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => [projectResponse],
    listActiveTasks: async (): Promise<TaskSummaryResponse[]> => [taskResponse],
    getTask: async (): Promise<TaskDetailResponse> => taskResponse,
    createTask: async (): Promise<TaskDetailResponse> => taskResponse,
    updateTaskStatus: async (): Promise<TaskDetailResponse> => ({
      ...taskResponse,
      statusId,
    }),
    updateTaskAssignee: async (): Promise<TaskDetailResponse> => ({
      ...taskResponse,
      assigneeUserId,
    }),
    updateTaskDueDate: async (): Promise<TaskDetailResponse> => ({
      ...taskResponse,
      dueAt,
    }),
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => previewResponse,
    archiveTask: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => applyResponse,
  };
}

function readBackendRequestInput(input: unknown): TaskSkillApplyRequest {
  if (!isUnknownRecord(input)) {
    throw new Error("Expected object input.");
  }

  const workspaceIdValue = readString(input, "workspaceId");
  const taskSkillIdValue = readString(input, "taskSkillId");
  const userIdValue = readString(input, "userId");
  const projectIdValue = readString(input, "projectId");
  const rootTaskTitleValue = readString(input, "rootTaskTitle");

  return {
    workspaceId: workspaceIdValue,
    taskSkillId: taskSkillIdValue,
    userId: userIdValue,
    body: {
      projectId: projectIdValue,
      rootTaskTitle: rootTaskTitleValue,
    },
  };
}

function isUnknownRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function readString(input: Record<string, unknown>, propertyName: string): string {
  const value = input[propertyName];

  if (typeof value !== "string") {
    throw new Error(`${propertyName} must be a string.`);
  }

  return value;
}

function readNullableString(input: Record<string, unknown>, propertyName: string): string | null {
  const value = input[propertyName];

  if (value === null || typeof value === "string") {
    return value;
  }

  throw new Error(`${propertyName} must be a string or null.`);
}

function readTextResult(result: CallToolResult): string {
  const content = result.content[0];

  if (content?.type !== "text") {
    throw new Error("Expected text content.");
  }

  return content.text;
}
