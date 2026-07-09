import assert from "node:assert/strict";
import test from "node:test";
import type {
  AddTaskSubtasksResponse,
  ApplyTaskSkillResponse,
  ArchiveProjectResponse,
  ArchiveTaskResponse,
  ArchiveTaskSkillResponse,
  CloneTaskSkillResponse,
  ConfirmationRequestDetailResponse,
  ConfirmationRequestSummaryResponse,
  ConfirmConfirmationRequestResponse,
  CreateProjectRequest,
  CreateTaskCommentRequest,
  CreateTaskFileAttachmentRequest,
  CreateTaskLinkAttachmentRequest,
  CreateTaskRequest,
  CreateTaskSkillResponse,
  CreateTaskTelegramFileAttachmentRequest,
  GetProjectRequest,
  GetTaskRequest,
  GetWorkspaceRequest,
  ListActiveProjectsRequest,
  ListActiveTasksRequest,
  ListTaskAttachmentsRequest,
  ListTaskCommentsRequest,
  ListTaskSkillsRequest,
  ListWorkspaceMembersRequest,
  ListWorkspaceStatusesRequest,
  ListWorkspacesRequest,
  MoveTaskResponse,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSkillDetailResponse,
  TaskSkillSummaryResponse,
  TaskSummaryResponse,
  UpdateProjectResponse,
  UpdateTaskResponse,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceStatusResponse,
  WorkspaceSummaryResponse,
} from "./backend-client.js";
import {
  createSummaryToolHandlers,
  parseProjectSummaryToolInput,
  parseTaskSummaryToolInput,
  parseUserSummaryToolInput,
  parseWorkspaceSummaryToolInput,
  SummaryToolInputError,
} from "./summary-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const videoProjectId = "33333333-3333-4333-8333-333333333333";
const taskId = "66666666-6666-4666-8666-666666666666";
const userId = "55555555-5555-4555-8555-555555555555";
const secondUserId = "77777777-7777-4777-8777-777777777777";

const workspaceSummary: WorkspaceSummaryResponse = {
  id: workspaceId,
  name: "Studio",
  slug: "studio",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-06T00:00:00.000Z",
};

const workspaceAdminMember: WorkspaceMemberResponse = {
  id: "12121212-1212-4121-8121-121212121212",
  workspaceId,
  userId,
  role: "admin",
  displayName: "Alex",
  email: "alex@example.com",
  avatarUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const workspaceDetail: WorkspaceDetailResponse = {
  ...workspaceSummary,
  members: [workspaceAdminMember],
};

const workspaceMembers: WorkspaceMemberResponse[] = [
  workspaceAdminMember,
  {
    id: "13131313-1313-4131-8131-131313131313",
    workspaceId,
    userId: secondUserId,
    role: "member",
    displayName: "Sam",
    email: null,
    avatarUrl: null,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

const workspaceStatuses: WorkspaceStatusResponse[] = [
  {
    id: "88888888-8888-4888-8888-888888888888",
    workspaceId,
    name: "In progress",
    color: "#3b82f6",
    position: "1000",
    isDone: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    workspaceId,
    name: "Done",
    color: "#22c55e",
    position: "2000",
    isDone: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const taskDetail: TaskDetailResponse = {
  id: taskId,
  workspaceId,
  projectId,
  parentTaskId: null,
  title: "Record bass",
  description: "Track final bass take.",
  statusId: "88888888-8888-4888-8888-888888888888",
  assigneeUserId: userId,
  createdByUserId: userId,
  position: "1000",
  dueAt: "2026-01-03T12:00:00.000Z",
  sourceSkillId: null,
  sourceSkillVersionId: null,
  metadata: {},
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

const projectDetail: ProjectDetailResponse = {
  id: projectId,
  workspaceId,
  title: "Album Release",
  description: "Release plan.",
  status: "active",
  position: "1000",
  createdByUserId: userId,
  archivedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-04T00:00:00.000Z",
};

const workspaceProjects: ProjectSummaryResponse[] = [
  {
    ...projectDetail,
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
  {
    ...projectDetail,
    id: videoProjectId,
    title: "Video Release",
    status: "active",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
];

const taskSkills: TaskSkillSummaryResponse[] = [
  {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId,
    name: "Song",
    description: "Song production template",
    aliases: ["track"],
    createdByUserId: userId,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const projectTasks: TaskSummaryResponse[] = [
  {
    ...taskDetail,
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    ...taskDetail,
    id: "77777777-7777-4777-8777-777777777777",
    parentTaskId: taskId,
    title: "Edit bass",
    assigneeUserId: null,
    dueAt: null,
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    ...taskDetail,
    id: "99999999-9999-4999-8999-999999999999",
    title: "Mix bass",
    assigneeUserId: null,
    dueAt: "2026-01-05T12:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

const videoProjectTasks: TaskSummaryResponse[] = [
  {
    ...taskDetail,
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    projectId: videoProjectId,
    title: "Edit teaser",
    statusId: "99999999-9999-4999-8999-999999999999",
    assigneeUserId: secondUserId,
    dueAt: "2026-01-06T12:00:00.000Z",
    updatedAt: "2026-01-06T00:00:00.000Z",
  },
  {
    ...taskDetail,
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    projectId: videoProjectId,
    title: "Export teaser",
    statusId: "88888888-8888-4888-8888-888888888888",
    assigneeUserId: secondUserId,
    dueAt: null,
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
];

const comments: TaskCommentResponse[] = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    workspaceId,
    taskId,
    authorUserId: userId,
    body: "First take uploaded.",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
  },
  {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    workspaceId,
    taskId,
    authorUserId: userId,
    body: "Second take is cleaner.",
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-02T10:00:00.000Z",
  },
];

const attachments: TaskAttachmentResponse[] = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    workspaceId,
    targetType: "task",
    targetId: taskId,
    kind: "link",
    title: "Reference",
    url: "https://example.com/reference",
    storageKey: null,
    telegramFileId: null,
    mimeType: null,
    sizeBytes: null,
    createdByUserId: userId,
    createdAt: "2026-01-01T11:00:00.000Z",
  },
  {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    workspaceId,
    targetType: "task",
    targetId: taskId,
    kind: "telegram_file",
    title: "Telegram bass take",
    url: null,
    storageKey: null,
    telegramFileId: "BQACAgIAAxkBAAIBR2Z",
    mimeType: "audio/mpeg",
    sizeBytes: "2048",
    createdByUserId: userId,
    createdAt: "2026-01-02T11:00:00.000Z",
  },
];

test("parseWorkspaceSummaryToolInput validates and normalizes workspace summary identifiers", () => {
  assert.deepEqual(
    parseWorkspaceSummaryToolInput({
      workspaceId: ` ${workspaceId} `,
      userId,
    }),
    {
      workspaceId,
      userId,
    },
  );
  assert.deepEqual(parseWorkspaceSummaryToolInput({ userId }), { userId });

  assert.throws(
    () => parseWorkspaceSummaryToolInput({ workspaceId: "bad", userId }),
    SummaryToolInputError,
  );
  assert.throws(() => parseWorkspaceSummaryToolInput({ workspaceId }), SummaryToolInputError);
  assert.throws(() => parseWorkspaceSummaryToolInput(null), SummaryToolInputError);
});

test("parseProjectSummaryToolInput validates and normalizes project summary identifiers", () => {
  assert.deepEqual(
    parseProjectSummaryToolInput({
      workspaceId: ` ${workspaceId} `,
      projectId,
      userId,
    }),
    {
      workspaceId,
      projectId,
      userId,
    },
  );

  assert.throws(
    () => parseProjectSummaryToolInput({ workspaceId, projectId: "bad", userId }),
    SummaryToolInputError,
  );
  assert.throws(
    () => parseProjectSummaryToolInput({ workspaceId, projectId }),
    SummaryToolInputError,
  );
  assert.throws(() => parseProjectSummaryToolInput(null), SummaryToolInputError);
});

test("parseTaskSummaryToolInput validates and normalizes task summary identifiers", () => {
  assert.deepEqual(
    parseTaskSummaryToolInput({
      workspaceId: ` ${workspaceId} `,
      projectId,
      taskId,
      userId,
    }),
    {
      workspaceId,
      projectId,
      taskId,
      userId,
    },
  );

  assert.throws(
    () => parseTaskSummaryToolInput({ workspaceId, projectId: "bad", taskId, userId }),
    SummaryToolInputError,
  );
  assert.throws(
    () => parseTaskSummaryToolInput({ workspaceId, projectId, taskId }),
    SummaryToolInputError,
  );
  assert.throws(() => parseTaskSummaryToolInput(null), SummaryToolInputError);
});

test("parseUserSummaryToolInput validates and normalizes user summary identifiers", () => {
  assert.deepEqual(
    parseUserSummaryToolInput({
      workspaceId: ` ${workspaceId} `,
      userId,
      targetUserId: secondUserId,
    }),
    {
      workspaceId,
      userId,
      targetUserId: secondUserId,
    },
  );
  assert.deepEqual(parseUserSummaryToolInput({ workspaceId, userId }), {
    workspaceId,
    userId,
  });

  assert.throws(
    () => parseUserSummaryToolInput({ workspaceId, userId, targetUserId: "bad" }),
    SummaryToolInputError,
  );
  assert.throws(() => parseUserSummaryToolInput({ workspaceId }), SummaryToolInputError);
  assert.throws(() => parseUserSummaryToolInput(null), SummaryToolInputError);
});

test("summary workspace handler aggregates workspace context with explicit workspace", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const getWorkspaceCalls: GetWorkspaceRequest[] = [];
  const listWorkspaceMembersCalls: ListWorkspaceMembersRequest[] = [];
  const listActiveProjectsCalls: ListActiveProjectsRequest[] = [];
  const listWorkspaceStatusesCalls: ListWorkspaceStatusesRequest[] = [];
  const listTaskSkillsCalls: ListTaskSkillsRequest[] = [];
  const listWorkspacesCalls: ListWorkspacesRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
      getWorkspaceCalls,
      listWorkspaceMembersCalls,
      listActiveProjectsCalls,
      listWorkspaceStatusesCalls,
      listTaskSkillsCalls,
      listWorkspacesCalls,
    }),
  );

  const summary = await handlers.workspace({ workspaceId, userId });

  assert.deepEqual(listWorkspacesCalls, []);
  assert.deepEqual(getWorkspaceCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listWorkspaceMembersCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listActiveProjectsCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listWorkspaceStatusesCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listTaskSkillsCalls, [{ workspaceId, userId }]);
  assert.deepEqual(summary, {
    workspace: {
      id: workspaceId,
      name: "Studio",
      slug: "studio",
      updatedAt: "2026-01-06T00:00:00.000Z",
    },
    counts: {
      members: 2,
      projects: 2,
      statuses: 2,
      taskSkills: 1,
    },
    members: [
      {
        userId,
        role: "admin",
        displayName: "Alex",
      },
      {
        userId: secondUserId,
        role: "member",
        displayName: "Sam",
      },
    ],
    recentProjects: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Video Release",
        status: "active",
        archivedAt: null,
        updatedAt: "2026-01-05T00:00:00.000Z",
      },
      {
        id: projectId,
        title: "Album Release",
        status: "active",
        archivedAt: null,
        updatedAt: "2026-01-04T00:00:00.000Z",
      },
    ],
    statuses: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        name: "In progress",
        isDone: false,
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        name: "Done",
        isDone: true,
      },
    ],
    taskSkills: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Song",
        aliases: ["track"],
      },
    ],
  });
});

test("summary workspace handler falls back to the first visible workspace", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const getWorkspaceCalls: GetWorkspaceRequest[] = [];
  const listWorkspacesCalls: ListWorkspacesRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
      getWorkspaceCalls,
      listWorkspacesCalls,
    }),
  );

  const summary = await handlers.workspace({ userId });

  assert.equal(summary.workspace.id, workspaceId);
  assert.deepEqual(listWorkspacesCalls, [{ userId }]);
  assert.deepEqual(getWorkspaceCalls, [{ workspaceId, userId }]);
});

test("summary user handler aggregates visible member assigned task context", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const listWorkspaceMembersCalls: ListWorkspaceMembersRequest[] = [];
  const listActiveProjectsCalls: ListActiveProjectsRequest[] = [];
  const listWorkspaceStatusesCalls: ListWorkspaceStatusesRequest[] = [];
  const listActiveTasksCalls: ListActiveTasksRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
      listWorkspaceMembersCalls,
      listActiveProjectsCalls,
      listWorkspaceStatusesCalls,
      listActiveTasksCalls,
    }),
  );

  const summary = await handlers.user({ workspaceId, userId, targetUserId: secondUserId });

  assert.deepEqual(listWorkspaceMembersCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listActiveProjectsCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listWorkspaceStatusesCalls, [{ workspaceId, userId }]);
  assert.deepEqual(listActiveTasksCalls, [
    { workspaceId, projectId, userId },
    { workspaceId, projectId: videoProjectId, userId },
  ]);
  assert.deepEqual(summary, {
    user: {
      userId: secondUserId,
      role: "member",
      displayName: "Sam",
      email: null,
      avatarUrl: null,
    },
    counts: {
      assignedTasks: 2,
      openAssignedTasks: 1,
      doneAssignedTasks: 1,
      dueAssignedTasks: 1,
      projectsWithAssignedTasks: 1,
    },
    recentAssignedTasks: [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        projectId: videoProjectId,
        projectTitle: "Video Release",
        parentTaskId: null,
        title: "Edit teaser",
        statusId: "99999999-9999-4999-8999-999999999999",
        statusName: "Done",
        isDone: true,
        dueAt: "2026-01-06T12:00:00.000Z",
        updatedAt: "2026-01-06T00:00:00.000Z",
      },
      {
        id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        projectId: videoProjectId,
        projectTitle: "Video Release",
        parentTaskId: null,
        title: "Export teaser",
        statusId: "88888888-8888-4888-8888-888888888888",
        statusName: "In progress",
        isDone: false,
        dueAt: null,
        updatedAt: "2026-01-05T00:00:00.000Z",
      },
    ],
  });
});

test("summary user handler defaults target user to caller", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
    }),
  );

  const summary = await handlers.user({ workspaceId, userId });

  assert.equal(summary.user.userId, userId);
  assert.equal(summary.counts.assignedTasks, 1);
});

test("summary user handler rejects hidden target members", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
    }),
  );

  await assert.rejects(
    handlers.user({
      workspaceId,
      userId,
      targetUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    }),
    SummaryToolInputError,
  );
});

test("summary project handler aggregates project detail and active tasks", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const getProjectCalls: GetProjectRequest[] = [];
  const listActiveTasksCalls: ListActiveTasksRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
      getProjectCalls,
      listActiveTasksCalls,
    }),
  );

  const summary = await handlers.project({ workspaceId, projectId, userId });

  assert.deepEqual(getProjectCalls, [{ workspaceId, projectId, userId }]);
  assert.deepEqual(listActiveTasksCalls, [{ workspaceId, projectId, userId }]);
  assert.deepEqual(summary, {
    project: {
      id: projectId,
      workspaceId,
      title: "Album Release",
      description: "Release plan.",
      status: "active",
      archivedAt: null,
      updatedAt: "2026-01-04T00:00:00.000Z",
    },
    counts: {
      tasks: 3,
      parentTasks: 2,
      subtasks: 1,
      assignedTasks: 1,
      unassignedTasks: 2,
      dueTasks: 2,
    },
    recentTasks: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        parentTaskId: taskId,
        title: "Edit bass",
        statusId: "88888888-8888-4888-8888-888888888888",
        assigneeUserId: null,
        dueAt: null,
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        id: taskId,
        parentTaskId: null,
        title: "Record bass",
        statusId: "88888888-8888-4888-8888-888888888888",
        assigneeUserId: userId,
        dueAt: "2026-01-03T12:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        parentTaskId: null,
        title: "Mix bass",
        statusId: "88888888-8888-4888-8888-888888888888",
        assigneeUserId: null,
        dueAt: "2026-01-05T12:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
});

test("summary task handler aggregates task detail, comments, and attachments", async () => {
  const getTaskCalls: GetTaskRequest[] = [];
  const listTaskCommentsCalls: ListTaskCommentsRequest[] = [];
  const listTaskAttachmentsCalls: ListTaskAttachmentsRequest[] = [];
  const handlers = createSummaryToolHandlers(
    createBackendClientStub({
      getTaskCalls,
      listTaskCommentsCalls,
      listTaskAttachmentsCalls,
    }),
  );

  const summary = await handlers.task({ workspaceId, projectId, taskId, userId });

  assert.deepEqual(getTaskCalls, [{ workspaceId, projectId, taskId, userId }]);
  assert.deepEqual(listTaskCommentsCalls, [{ workspaceId, projectId, taskId, userId }]);
  assert.deepEqual(listTaskAttachmentsCalls, [{ workspaceId, projectId, taskId, userId }]);
  assert.deepEqual(summary, {
    task: {
      id: taskId,
      workspaceId,
      projectId,
      parentTaskId: null,
      title: "Record bass",
      description: "Track final bass take.",
      statusId: "88888888-8888-4888-8888-888888888888",
      assigneeUserId: userId,
      dueAt: "2026-01-03T12:00:00.000Z",
      archivedAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
    counts: {
      comments: 2,
      attachments: 2,
    },
    recentComments: [
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        authorUserId: userId,
        body: "Second take is cleaner.",
        createdAt: "2026-01-02T10:00:00.000Z",
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        authorUserId: userId,
        body: "First take uploaded.",
        createdAt: "2026-01-01T10:00:00.000Z",
      },
    ],
    recentAttachments: [
      {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        kind: "telegram_file",
        title: "Telegram bass take",
        url: null,
        storageKey: null,
        telegramFileId: "BQACAgIAAxkBAAIBR2Z",
        mimeType: "audio/mpeg",
        sizeBytes: "2048",
        createdAt: "2026-01-02T11:00:00.000Z",
      },
      {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        kind: "link",
        title: "Reference",
        url: "https://example.com/reference",
        storageKey: null,
        telegramFileId: null,
        mimeType: null,
        sizeBytes: null,
        createdAt: "2026-01-01T11:00:00.000Z",
      },
    ],
  });
});

type BackendClientStubCalls = {
  getTaskCalls: GetTaskRequest[];
  listTaskCommentsCalls: ListTaskCommentsRequest[];
  listTaskAttachmentsCalls: ListTaskAttachmentsRequest[];
  getProjectCalls?: GetProjectRequest[];
  listActiveTasksCalls?: ListActiveTasksRequest[];
  listWorkspacesCalls?: ListWorkspacesRequest[];
  getWorkspaceCalls?: GetWorkspaceRequest[];
  listWorkspaceMembersCalls?: ListWorkspaceMembersRequest[];
  listWorkspaceStatusesCalls?: ListWorkspaceStatusesRequest[];
  listTaskSkillsCalls?: ListTaskSkillsRequest[];
  listActiveProjectsCalls?: ListActiveProjectsRequest[];
};

function createBackendClientStub(calls: BackendClientStubCalls): TaskBackendClient {
  const getProjectCalls = calls.getProjectCalls ?? [];
  const listActiveTasksCalls = calls.listActiveTasksCalls ?? [];
  const listWorkspacesCalls = calls.listWorkspacesCalls ?? [];
  const getWorkspaceCalls = calls.getWorkspaceCalls ?? [];
  const listWorkspaceMembersCalls = calls.listWorkspaceMembersCalls ?? [];
  const listWorkspaceStatusesCalls = calls.listWorkspaceStatusesCalls ?? [];
  const listTaskSkillsCalls = calls.listTaskSkillsCalls ?? [];
  const listActiveProjectsCalls = calls.listActiveProjectsCalls ?? [];

  return {
    listWorkspaces: async (request): Promise<WorkspaceSummaryResponse[]> => {
      listWorkspacesCalls.push(request);

      return [workspaceSummary];
    },
    getWorkspace: async (request): Promise<WorkspaceDetailResponse> => {
      getWorkspaceCalls.push(request);

      return workspaceDetail;
    },
    listWorkspaceMembers: async (request): Promise<WorkspaceMemberResponse[]> => {
      listWorkspaceMembersCalls.push(request);

      return workspaceMembers;
    },
    listWorkspaceStatuses: async (request): Promise<WorkspaceStatusResponse[]> => {
      listWorkspaceStatusesCalls.push(request);

      return workspaceStatuses;
    },
    listPendingConfirmationRequests: async (): Promise<ConfirmationRequestSummaryResponse[]> => {
      throw new Error("Not implemented.");
    },
    getConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> => {
      throw new Error("Not implemented.");
    },
    cancelConfirmationRequest: async (): Promise<ConfirmationRequestDetailResponse> => {
      throw new Error("Not implemented.");
    },
    confirmConfirmationRequest: async (): Promise<ConfirmConfirmationRequestResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskSkills: async (request): Promise<TaskSkillSummaryResponse[]> => {
      listTaskSkillsCalls.push(request);

      return taskSkills;
    },
    getTaskSkill: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    createTaskSkill: async (): Promise<CreateTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
    cloneTaskSkill: async (): Promise<CloneTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
    archiveTaskSkill: async (): Promise<ArchiveTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillMetadata: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    updateTaskSkillDefinition: async (): Promise<TaskSkillDetailResponse> => {
      throw new Error("Not implemented.");
    },
    listActiveProjects: async (request): Promise<ProjectSummaryResponse[]> => {
      listActiveProjectsCalls.push(request);

      return workspaceProjects;
    },
    getProject: async (request): Promise<ProjectDetailResponse> => {
      getProjectCalls.push(request);

      return projectDetail;
    },
    createProject: async (_request: CreateProjectRequest): Promise<ProjectDetailResponse> => {
      throw new Error("Not implemented.");
    },
    archiveProject: async (): Promise<ArchiveProjectResponse> => {
      throw new Error("Not implemented.");
    },
    updateProject: async (): Promise<UpdateProjectResponse> => {
      throw new Error("Not implemented.");
    },
    listActiveTasks: async (request): Promise<TaskSummaryResponse[]> => {
      listActiveTasksCalls.push(request);

      if (request.projectId === videoProjectId) {
        return videoProjectTasks;
      }

      return projectTasks;
    },
    listTaskComments: async (request): Promise<TaskCommentResponse[]> => {
      calls.listTaskCommentsCalls.push(request);

      return comments;
    },
    createTaskComment: async (_request: CreateTaskCommentRequest): Promise<TaskCommentResponse> => {
      throw new Error("Not implemented.");
    },
    listTaskAttachments: async (request): Promise<TaskAttachmentResponse[]> => {
      calls.listTaskAttachmentsCalls.push(request);

      return attachments;
    },
    createTaskLinkAttachment: async (
      _request: CreateTaskLinkAttachmentRequest,
    ): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
    createTaskFileAttachment: async (
      _request: CreateTaskFileAttachmentRequest,
    ): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
    createTaskTelegramFileAttachment: async (
      _request: CreateTaskTelegramFileAttachmentRequest,
    ): Promise<TaskAttachmentResponse> => {
      throw new Error("Not implemented.");
    },
    getTask: async (request): Promise<TaskDetailResponse> => {
      calls.getTaskCalls.push(request);

      return taskDetail;
    },
    createTask: async (_request: CreateTaskRequest): Promise<TaskDetailResponse> => {
      throw new Error("Not implemented.");
    },
    addTaskSubtasks: async (): Promise<AddTaskSubtasksResponse> => {
      throw new Error("Not implemented.");
    },
    updateTask: async (): Promise<UpdateTaskResponse> => {
      throw new Error("Not implemented.");
    },
    moveTask: async (): Promise<MoveTaskResponse> => {
      throw new Error("Not implemented.");
    },
    archiveTask: async (): Promise<ArchiveTaskResponse> => {
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
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => {
      throw new Error("Not implemented.");
    },
    applyTaskSkill: async (): Promise<ApplyTaskSkillResponse> => {
      throw new Error("Not implemented.");
    },
  };
}
