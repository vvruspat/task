import assert from "node:assert/strict";
import test from "node:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyResponse,
  TaskBackendFetch,
  TaskBackendFetchInit,
  TaskBackendFetchResponse,
} from "./backend-client.js";
import { runTaskMcpServerFromEnvironment } from "./runtime.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskSkillId = "33333333-3333-4333-8333-333333333333";
const taskSkillVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const rootTaskId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-01-01T00:00:00.000Z";

test("runTaskMcpServerFromEnvironment wires configured backend client into the server", async () => {
  const fetchCalls: FetchCall[] = [];
  const connectCalls: McpServer[] = [];
  const fetch = createFetchStub(fetchCalls);

  await runTaskMcpServerFromEnvironment({
    environment: {
      TASK_API_BASE_URL: "https://api.example.test/",
      TASK_MCP_SERVER_NAME: "task-test",
      TASK_MCP_SERVER_VERSION: "1.0.0",
    },
    fetch,
    connect: async (server): Promise<void> => {
      connectCalls.push(server);
    },
  });

  assert.equal(connectCalls.length, 1);

  const server = connectCalls[0];
  assert.ok(server !== undefined);
  assert.equal(server.isConnected(), false);

  const applyTool = readRegisteredTool(server, "skill.apply");
  const result = await applyTool.handler({
    workspaceId,
    taskSkillId,
    userId,
    projectId,
    rootTaskTitle: "Intro",
  });

  assert.deepEqual(fetchCalls, [
    {
      input:
        "https://api.example.test/workspaces/11111111-1111-4111-8111-111111111111/task-skills/33333333-3333-4333-8333-333333333333/apply",
      init: {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-task-user-id": userId,
        },
        body: JSON.stringify({
          projectId,
          rootTaskTitle: "Intro",
        }),
      },
    },
  ]);
  assert.deepEqual(JSON.parse(readTextResult(result)), applyResponse);
});

test("runTaskMcpServerFromEnvironment discovers scoped integration tools", async () => {
  const fetchCalls: FetchCall[] = [];
  const connectCalls: McpServer[] = [];
  const fetch: TaskBackendFetch = async (input, init): Promise<TaskBackendFetchResponse> => {
    fetchCalls.push({ input, init });
    const responseBody: unknown =
      init.method === "GET"
        ? [
            {
              description: "Search connected Google Drive files.",
              inputSchema: {
                additionalProperties: false,
                properties: {
                  query: { maxLength: 200, minLength: 1, type: "string" },
                },
                required: ["query"],
                type: "object",
              },
              name: "gdrive_search",
              readOnly: true,
            },
          ]
        : { name: "gdrive_search", result: { files: [] } };
    return {
      json: async (): Promise<unknown> => responseBody,
      ok: true,
      status: 200,
      statusText: "OK",
    };
  };

  await runTaskMcpServerFromEnvironment({
    connect: async (server): Promise<void> => {
      connectCalls.push(server);
    },
    environment: {
      TASK_API_BASE_URL: "https://api.example.test/",
      TASK_MCP_USER_ID: userId,
      TASK_MCP_WORKSPACE_ID: workspaceId,
    },
    fetch,
  });

  const server = connectCalls[0];
  assert.ok(server !== undefined);
  const result = await readRegisteredTool(server, "gdrive_search").handler({ query: "brief" });

  assert.deepEqual(fetchCalls, [
    {
      input: `https://api.example.test/workspaces/${workspaceId}/integration-tools`,
      init: {
        headers: { accept: "application/json", "x-task-user-id": userId },
        method: "GET",
      },
    },
    {
      input: `https://api.example.test/workspaces/${workspaceId}/integration-tools/execute`,
      init: {
        body: JSON.stringify({ arguments: { query: "brief" }, name: "gdrive_search" }),
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-task-user-id": userId,
        },
        method: "POST",
      },
    },
  ]);
  assert.deepEqual(result.structuredContent, { files: [] });
});

type FetchCall = {
  input: string;
  init: TaskBackendFetchInit;
};

type RegisteredServerTool = {
  handler(input: Record<string, unknown>): Promise<CallToolResult>;
};

type RegisteredServerToolCollection = {
  [name: string]: RegisteredServerTool | undefined;
};

function createFetchStub(calls: FetchCall[]): TaskBackendFetch {
  return async (input, init): Promise<TaskBackendFetchResponse> => {
    calls.push({ input, init });

    return {
      ok: true,
      status: 201,
      statusText: "Created",
      json: async (): Promise<ApplyTaskSkillResponse | PreviewTaskSkillApplyResponse> =>
        input.endsWith("/preview-apply") ? previewResponse : applyResponse,
    };
  };
}

function readRegisteredTool(server: McpServer, name: string): RegisteredServerTool {
  const tools = readRegisteredTools(server);
  const tool = tools[name];

  if (tool === undefined) {
    throw new Error(`Expected ${name} to be registered.`);
  }

  return tool;
}

function readRegisteredTools(server: McpServer): RegisteredServerToolCollection {
  const value = readProperty(server, "_registeredTools");

  if (!isRegisteredServerToolCollection(value)) {
    throw new Error("Expected registered tools collection.");
  }

  return value;
}

function readProperty(input: unknown, propertyName: string): unknown {
  if (!isUnknownRecord(input)) {
    throw new Error("Expected object input.");
  }

  return input[propertyName];
}

function isRegisteredServerToolCollection(input: unknown): input is RegisteredServerToolCollection {
  return isUnknownRecord(input);
}

function isUnknownRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function readTextResult(result: CallToolResult): string {
  const content = result.content[0];

  if (content?.type !== "text" || typeof content.text !== "string") {
    throw new Error("Expected text content.");
  }

  return content.text;
}

const previewResponse: PreviewTaskSkillApplyResponse = {
  workspaceId,
  projectId,
  taskSkillId,
  taskSkillVersionId,
  taskSkillVersion: 1,
  rootTaskTitle: "Intro",
  subtasks: [{ title: "Lyrics", labels: [], source: "skill" }],
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
    number: 1,
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
