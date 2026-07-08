import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApplyTaskSkillResponse,
  CreateTaskSkillRequest,
  PreviewTaskSkillApplyResponse,
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
  TaskSkillApplyRequest,
  TaskSkillDetailResponse,
  TaskSkillSummaryResponse,
  TaskSummaryResponse,
  UpdateTaskSkillDefinitionRequest,
  UpdateTaskSkillMetadataRequest,
  WorkspaceStatusResponse,
} from "./backend-client.js";
import {
  createTaskSkillToolHandlers,
  parseTaskSkillApplyToolInput,
  parseTaskSkillCreateToolInput,
  parseTaskSkillGetToolInput,
  parseTaskSkillSearchToolInput,
  parseTaskSkillUpdateDefinitionToolInput,
  parseTaskSkillUpdateMetadataToolInput,
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

const createInput = {
  workspaceId,
  userId,
  name: " Song ",
  description: " Song production template ",
  aliases: [" track ", "track"],
  definition: {
    subtasks: [{ title: "Lyrics" }],
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

test("parseTaskSkillSearchToolInput validates and normalizes search payloads", () => {
  assert.deepEqual(
    parseTaskSkillSearchToolInput({
      workspaceId,
      userId,
      query: " song ",
    }),
    {
      workspaceId,
      userId,
      query: "song",
    },
  );

  assert.throws(() => parseTaskSkillSearchToolInput(null), TaskSkillToolInputError);
  assert.throws(
    () => parseTaskSkillSearchToolInput({ workspaceId, userId, query: "" }),
    TaskSkillToolInputError,
  );
});

test("parseTaskSkillGetToolInput validates skill identifiers", () => {
  assert.deepEqual(
    parseTaskSkillGetToolInput({
      workspaceId,
      taskSkillId,
      userId,
    }),
    {
      workspaceId,
      taskSkillId,
      userId,
    },
  );
});

test("parseTaskSkillCreateToolInput validates and normalizes create payloads", () => {
  assert.deepEqual(parseTaskSkillCreateToolInput(createInput), {
    workspaceId,
    userId,
    name: "Song",
    description: "Song production template",
    aliases: ["track"],
    definition: {
      subtasks: [{ title: "Lyrics" }],
    },
  });
  assert.deepEqual(parseTaskSkillCreateToolInput({ ...createInput, description: null }), {
    workspaceId,
    userId,
    name: "Song",
    description: null,
    aliases: ["track"],
    definition: {
      subtasks: [{ title: "Lyrics" }],
    },
  });
  assert.throws(() => parseTaskSkillCreateToolInput(null), TaskSkillToolInputError);
  assert.throws(
    () => parseTaskSkillCreateToolInput({ ...createInput, name: "" }),
    TaskSkillToolInputError,
  );
  assert.throws(
    () => parseTaskSkillCreateToolInput({ ...createInput, definition: [] }),
    TaskSkillToolInputError,
  );
  assert.throws(
    () => parseTaskSkillCreateToolInput({ ...createInput, aliases: [""] }),
    TaskSkillToolInputError,
  );
});

test("parseTaskSkillUpdateMetadataToolInput validates and normalizes metadata payloads", () => {
  assert.deepEqual(
    parseTaskSkillUpdateMetadataToolInput({
      workspaceId,
      taskSkillId,
      userId,
      name: " Updated song ",
      description: null,
      aliases: [" single ", "single"],
    }),
    {
      workspaceId,
      taskSkillId,
      userId,
      name: "Updated song",
      description: null,
      aliases: ["single"],
    },
  );
  assert.throws(
    () => parseTaskSkillUpdateMetadataToolInput({ workspaceId, taskSkillId, userId }),
    TaskSkillToolInputError,
  );
  assert.throws(
    () =>
      parseTaskSkillUpdateMetadataToolInput({
        workspaceId,
        taskSkillId,
        userId,
        aliases: [1],
      }),
    TaskSkillToolInputError,
  );
});

test("parseTaskSkillUpdateDefinitionToolInput validates definition payloads", () => {
  assert.deepEqual(
    parseTaskSkillUpdateDefinitionToolInput({
      workspaceId,
      taskSkillId,
      userId,
      definition: {
        subtasks: [{ title: "Arrange" }],
      },
    }),
    {
      workspaceId,
      taskSkillId,
      userId,
      definition: {
        subtasks: [{ title: "Arrange" }],
      },
    },
  );
  assert.throws(
    () =>
      parseTaskSkillUpdateDefinitionToolInput({
        workspaceId,
        taskSkillId,
        userId,
        definition: [],
      }),
    TaskSkillToolInputError,
  );
});

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

test("task skill search handler lists skills when query is absent", async () => {
  const calls: Array<{ workspaceId: string; userId: string }> = [];
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      listTaskSkillCalls: calls,
      taskSkills: [taskSkillSummary],
    }),
  );

  assert.deepEqual(await handlers.search({ workspaceId, userId }), [taskSkillSummary]);
  assert.deepEqual(calls, [{ workspaceId, userId }]);
});

test("task skill search handler filters by name and aliases", async () => {
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      taskSkills: [
        taskSkillSummary,
        {
          ...taskSkillSummary,
          id: "88888888-8888-4888-8888-888888888888",
          name: "Release",
          aliases: ["launch"],
        },
      ],
    }),
  );

  assert.deepEqual(await handlers.search({ workspaceId, userId, query: "track" }), [
    taskSkillSummary,
  ]);
});

test("task skill get handler forwards identifiers to the backend client", async () => {
  const calls: Array<{ workspaceId: string; taskSkillId: string; userId: string }> = [];
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      getTaskSkillCalls: calls,
    }),
  );

  assert.deepEqual(await handlers.get({ workspaceId, taskSkillId, userId }), taskSkillDetail);
  assert.deepEqual(calls, [{ workspaceId, taskSkillId, userId }]);
});

test("task skill create handler forwards payloads to the backend client", async () => {
  const calls: CreateTaskSkillRequest[] = [];
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      createTaskSkillCalls: calls,
    }),
  );

  assert.deepEqual(await handlers.create(createInput), taskSkillDetail);
  assert.deepEqual(calls, [
    {
      workspaceId,
      userId,
      body: {
        name: "Song",
        description: "Song production template",
        aliases: ["track"],
        definition: {
          subtasks: [{ title: "Lyrics" }],
        },
      },
    },
  ]);
});

test("task skill update metadata handler forwards payloads to the backend client", async () => {
  const calls: UpdateTaskSkillMetadataRequest[] = [];
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      updateTaskSkillMetadataCalls: calls,
    }),
  );

  assert.deepEqual(
    await handlers.updateMetadata({
      workspaceId,
      taskSkillId,
      userId,
      name: " Updated song ",
      aliases: [" single "],
    }),
    taskSkillDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      taskSkillId,
      userId,
      body: {
        name: "Updated song",
        aliases: ["single"],
      },
    },
  ]);
});

test("task skill update definition handler forwards payloads to the backend client", async () => {
  const calls: UpdateTaskSkillDefinitionRequest[] = [];
  const handlers = createTaskSkillToolHandlers(
    createBackendClientStub([], {
      updateTaskSkillDefinitionCalls: calls,
    }),
  );

  const definition = {
    subtasks: [{ title: "Arrange" }],
  };

  assert.deepEqual(
    await handlers.updateDefinition({
      workspaceId,
      taskSkillId,
      userId,
      definition,
    }),
    taskSkillDetail,
  );
  assert.deepEqual(calls, [
    {
      workspaceId,
      taskSkillId,
      userId,
      body: {
        definition,
      },
    },
  ]);
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

function createBackendClientStub(
  calls: TaskSkillApplyRequest[],
  options: {
    createTaskSkillCalls?: CreateTaskSkillRequest[];
    getTaskSkillCalls?: Array<{ workspaceId: string; taskSkillId: string; userId: string }>;
    listTaskSkillCalls?: Array<{ workspaceId: string; userId: string }>;
    updateTaskSkillMetadataCalls?: UpdateTaskSkillMetadataRequest[];
    updateTaskSkillDefinitionCalls?: UpdateTaskSkillDefinitionRequest[];
    taskSkills?: TaskSkillSummaryResponse[];
  } = {},
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
    listPendingConfirmationRequests: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    getConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    createConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    cancelConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    confirmConfirmationRequest: async (): Promise<never> => {
      throw new Error("Not implemented.");
    },
    listTaskSkills: async (request): Promise<TaskSkillSummaryResponse[]> => {
      options.listTaskSkillCalls?.push(request);

      return options.taskSkills ?? [taskSkillSummary];
    },
    getTaskSkill: async (request): Promise<TaskSkillDetailResponse> => {
      options.getTaskSkillCalls?.push(request);

      return taskSkillDetail;
    },
    createTaskSkill: async (request): Promise<TaskSkillDetailResponse> => {
      options.createTaskSkillCalls?.push(request);

      return taskSkillDetail;
    },
    updateTaskSkillMetadata: async (request): Promise<TaskSkillDetailResponse> => {
      options.updateTaskSkillMetadataCalls?.push(request);

      return taskSkillDetail;
    },
    updateTaskSkillDefinition: async (request): Promise<TaskSkillDetailResponse> => {
      options.updateTaskSkillDefinitionCalls?.push(request);

      return taskSkillDetail;
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
