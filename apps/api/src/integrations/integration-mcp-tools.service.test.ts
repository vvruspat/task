import assert from "node:assert/strict";
import test from "node:test";
import type { IntegrationAgentToolDefinition } from "@task/integration-sdk";
import type {
  IntegrationMcpToolCallStore,
  StartIntegrationMcpToolCallInput,
} from "./integration-mcp-tools.contracts.js";
import { formatMcpToolError, IntegrationMcpToolsService } from "./integration-mcp-tools.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const definitions: readonly IntegrationAgentToolDefinition[] = [
  {
    description: "Search Drive files.",
    inputSchema: {
      additionalProperties: false,
      properties: { query: { type: "string" } },
      required: ["query"],
      type: "object",
    },
    name: "gdrive_search",
    readOnly: true,
  },
  {
    description: "Rename a Drive file.",
    inputSchema: { additionalProperties: false, properties: {}, type: "object" },
    name: "gdrive_rename",
    readOnly: false,
  },
];

test("MCP integration service lists and audits only read-only provider tools", async () => {
  const audit = new RecordingMcpAuditStore();
  const executions: unknown[] = [];
  const service = new IntegrationMcpToolsService(
    {
      async listTools() {
        return definitions;
      },
      async executeTool(call, actualWorkspaceId, actualUserId) {
        executions.push({ actualUserId, actualWorkspaceId, call });
        return { files: [], kind: "google_drive_search_results" };
      },
    },
    audit,
  );

  assert.deepEqual(
    (await service.listTools(workspaceId, userId)).map((tool) => tool.name),
    ["gdrive_search"],
  );
  assert.deepEqual(
    await service.executeTool(
      { arguments: { query: "brief" }, name: "gdrive_search" },
      workspaceId,
      userId,
    ),
    {
      name: "gdrive_search",
      result: { files: [], kind: "google_drive_search_results" },
    },
  );
  assert.deepEqual(executions, [
    {
      actualUserId: userId,
      actualWorkspaceId: workspaceId,
      call: { arguments: { query: "brief" }, name: "gdrive_search" },
    },
  ]);
  assert.deepEqual(audit.started, [
    { arguments: { query: "brief" }, toolName: "gdrive_search", userId, workspaceId },
  ]);
  assert.equal(audit.succeeded.length, 1);
  assert.equal(audit.failed.length, 0);
  await assert.rejects(
    service.executeTool({ arguments: {}, name: "gdrive_rename" }, workspaceId, userId),
    /Unsupported read-only integration tool/u,
  );
});

test("MCP integration service audits provider failures", async () => {
  const audit = new RecordingMcpAuditStore();
  const service = new IntegrationMcpToolsService(
    {
      async listTools() {
        return definitions;
      },
      async executeTool() {
        throw new Error("Provider unavailable");
      },
    },
    audit,
  );

  await assert.rejects(
    service.executeTool(
      { arguments: { query: "brief" }, name: "gdrive_search" },
      workspaceId,
      userId,
    ),
    /Provider unavailable/u,
  );
  assert.equal(audit.failed[0]?.error, "Error: Provider unavailable");
  assert.equal(formatMcpToolError("secret"), "Unknown MCP tool error");
});

class RecordingMcpAuditStore implements IntegrationMcpToolCallStore {
  readonly started: StartIntegrationMcpToolCallInput[] = [];
  readonly succeeded: Array<{ id: string; result: Record<string, unknown> }> = [];
  readonly failed: Array<{ error: string; id: string }> = [];

  async start(input: StartIntegrationMcpToolCallInput): Promise<string> {
    this.started.push(input);
    return "33333333-3333-4333-8333-333333333333";
  }

  async succeed(id: string, result: Record<string, unknown>, _completedAt: Date): Promise<void> {
    this.succeeded.push({ id, result });
  }

  async fail(id: string, error: string, _completedAt: Date): Promise<void> {
    this.failed.push({ error, id });
  }
}
