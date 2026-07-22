import assert from "node:assert/strict";
import test from "node:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import * as z from "zod/v4";
import type {
  IntegrationMcpToolDefinitionResponse,
  TaskBackendIntegrationClient,
} from "./backend-client.js";
import {
  parseIntegrationMcpToolDefinitions,
  registerIntegrationMcpTools,
  toZodRawShape,
} from "./integration-mcp-tools.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

const driveSearchDefinition: IntegrationMcpToolDefinitionResponse = {
  description: "Search files in the connected Google Drive installation.",
  inputSchema: {
    additionalProperties: false,
    properties: {
      limit: { maximum: 20, minimum: 1, type: "integer" },
      query: { maxLength: 200, minLength: 1, type: "string" },
    },
    required: ["query"],
    type: "object",
  },
  name: "gdrive_search",
  readOnly: true,
};

test("integration MCP definitions become strict runtime schemas", () => {
  const [definition] = parseIntegrationMcpToolDefinitions([driveSearchDefinition]);
  assert.ok(definition !== undefined);

  const schema = z.object(toZodRawShape(definition.inputSchema)).strict();
  assert.equal(schema.safeParse({ limit: 5, query: "brief" }).success, true);
  assert.equal(schema.safeParse({ query: "brief" }).success, true);
  assert.equal(schema.safeParse({ limit: 21, query: "brief" }).success, false);
  assert.equal(schema.safeParse({ limit: 5 }).success, false);
  assert.equal(schema.safeParse({ query: "brief", userId }).success, false);
});

test("integration MCP definition parser rejects unsafe schemas and duplicate names", () => {
  assert.throws(
    () => parseIntegrationMcpToolDefinitions([driveSearchDefinition, driveSearchDefinition]),
    /duplicate/u,
  );
  assert.throws(
    () =>
      parseIntegrationMcpToolDefinitions([
        {
          ...driveSearchDefinition,
          inputSchema: {
            ...driveSearchDefinition.inputSchema,
            required: ["missing"],
          },
        },
      ]),
    /required properties/u,
  );
  assert.throws(
    () =>
      parseIntegrationMcpToolDefinitions([
        {
          ...driveSearchDefinition,
          inputSchema: {
            ...driveSearchDefinition.inputSchema,
            properties: {
              createdAt: { format: "email", type: "string" },
            },
            required: [],
          },
        },
      ]),
    /format email is unsupported/u,
  );
});

test("registered integration tools execute with server-owned workspace context", async () => {
  const requests: Array<Parameters<TaskBackendIntegrationClient["executeIntegrationMcpTool"]>[0]> =
    [];
  const backendClient: Pick<TaskBackendIntegrationClient, "executeIntegrationMcpTool"> = {
    executeIntegrationMcpTool: async (request) => {
      requests.push(request);
      return { name: "gdrive_search", result: { files: [] } };
    },
  };
  const server = new McpServer({ name: "integration-test", version: "1.0.0" });
  const tools = parseIntegrationMcpToolDefinitions([driveSearchDefinition]);

  registerIntegrationMcpTools(server, backendClient, { userId, workspaceId }, tools);
  const result = await readRegisteredTool(server, "gdrive_search").handler({
    limit: 5,
    query: "brief",
  });

  assert.deepEqual(requests, [
    {
      body: { arguments: { limit: 5, query: "brief" }, name: "gdrive_search" },
      userId,
      workspaceId,
    },
  ]);
  assert.deepEqual(result.structuredContent, { files: [] });
  assert.equal(readTextResult(result), '{\n  "files": []\n}');
});

type RegisteredServerTool = {
  handler(input: Record<string, unknown>): Promise<CallToolResult>;
};

function readRegisteredTool(server: McpServer, name: string): RegisteredServerTool {
  const tools = readProperty(server, "_registeredTools");
  if (!isUnknownRecord(tools)) {
    throw new Error("Expected registered tools collection.");
  }
  const tool = tools[name];
  if (!isRegisteredServerTool(tool)) {
    throw new Error(`Expected ${name} to be registered.`);
  }
  return tool;
}

function isRegisteredServerTool(value: unknown): value is RegisteredServerTool {
  return isUnknownRecord(value) && typeof readProperty(value, "handler") === "function";
}

function readProperty(value: unknown, key: string): unknown {
  if (!isUnknownRecord(value)) throw new Error("Expected object value.");
  return value[key];
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTextResult(result: CallToolResult): string {
  const content = result.content[0];
  if (content?.type !== "text") throw new Error("Expected text content.");
  return content.text;
}
