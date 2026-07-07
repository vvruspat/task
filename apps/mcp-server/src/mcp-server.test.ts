import assert from "node:assert/strict";
import test from "node:test";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  ApplyTaskSkillResponse,
  CreateProjectRequest,
  PreviewTaskSkillApplyResponse,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
  TaskDetailResponse,
  TaskSkillApplyRequest,
  TaskSummaryResponse,
} from "./backend-client.js";
import {
  createTaskMcpServer,
  registerProjectTools,
  registerTaskSkillApplyTools,
  registerTaskTools,
  type TaskMcpToolRegistrar,
} from "./mcp-server.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-01-01T00:00:00.000Z";

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

test("registerProjectTools registers project tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const createCalls: CreateProjectRequest[] = [];
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
    ["project.create", "project.get", "project.search"],
  );
  assert.equal(toolCalls[0]?.config.title, "Create project");
  assert.equal(toolCalls[1]?.config.title, "Get project");
  assert.equal(toolCalls[2]?.config.title, "Search projects");

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

  const searchCall = toolCalls[2];
  assert.ok(searchCall !== undefined);
  const searchResult = await searchCall.callback({
    workspaceId,
    userId,
    query: "album",
  });

  assert.deepEqual(JSON.parse(readTextResult(searchResult)), [projectResponse]);
});

test("registerTaskTools registers task tools", async () => {
  const toolCalls: RegisteredToolCall[] = [];
  const registrar = createRegistrar(toolCalls);

  registerTaskTools(registrar, {
    get: async (input: unknown): Promise<TaskDetailResponse> => {
      assert.deepEqual(input, {
        workspaceId,
        projectId,
        taskId: rootTaskId,
        userId,
      });
      return taskResponse;
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
    ["task.get", "task.search"],
  );
  assert.equal(toolCalls[0]?.config.title, "Get task");
  assert.equal(toolCalls[1]?.config.title, "Search tasks");

  const getCall = toolCalls[0];
  assert.ok(getCall !== undefined);
  const getResult = await getCall.callback({
    workspaceId,
    projectId,
    taskId: rootTaskId,
    userId,
  });

  assert.deepEqual(JSON.parse(readTextResult(getResult)), taskResponse);

  const searchCall = toolCalls[1];
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
    ["skill.preview_apply", "skill.apply"],
  );
  assert.equal(toolCalls[0]?.config.title, "Preview task skill application");
  assert.equal(toolCalls[1]?.config.title, "Apply task skill");

  const previewCall = toolCalls[0];
  assert.ok(previewCall !== undefined);
  const previewResult = await previewCall.callback(toolInput);

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

  const applyCall = toolCalls[1];
  assert.ok(applyCall !== undefined);
  const applyResult = await applyCall.callback(toolInput);

  assert.deepEqual(JSON.parse(readTextResult(applyResult)), applyResponse);
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
    createProject: async (): Promise<ProjectDetailResponse> => projectDetailResponse,
    getProject: async (): Promise<ProjectDetailResponse> => projectDetailResponse,
    listActiveProjects: async (): Promise<ProjectSummaryResponse[]> => [projectResponse],
    listActiveTasks: async (): Promise<TaskSummaryResponse[]> => [taskResponse],
    getTask: async (): Promise<TaskDetailResponse> => taskResponse,
    previewTaskSkillApply: async (): Promise<PreviewTaskSkillApplyResponse> => previewResponse,
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

function readTextResult(result: CallToolResult): string {
  const content = result.content[0];

  if (content?.type !== "text") {
    throw new Error("Expected text content.");
  }

  return content.text;
}
