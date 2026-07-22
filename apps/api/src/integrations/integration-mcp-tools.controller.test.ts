import assert from "node:assert/strict";
import test from "node:test";
import { IntegrationMcpToolsController } from "./integration-mcp-tools.controller.js";
import { IntegrationMcpToolExecutionDto } from "./integration-mcp-tools.dto.js";
import { IntegrationMcpToolsService } from "./integration-mcp-tools.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";

test("integration MCP controller uses trusted route and user context", async () => {
  const calls: unknown[] = [];
  const service = new IntegrationMcpToolsService(
    {
      async listTools(actualWorkspaceId, actualUserId) {
        calls.push({ actualUserId, actualWorkspaceId, kind: "list" });
        return [
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
        ];
      },
      async executeTool(input, actualWorkspaceId, actualUserId) {
        calls.push({ actualUserId, actualWorkspaceId, input, kind: "execute" });
        return { files: [], kind: "google_drive_search_results" };
      },
    },
    {
      async start() {
        return "33333333-3333-4333-8333-333333333333";
      },
      async succeed() {},
      async fail() {},
    },
  );
  const controller = new IntegrationMcpToolsController(service);

  assert.deepEqual(
    (await controller.listTools(workspaceId, userId)).map((tool) => tool.name),
    ["gdrive_search"],
  );
  const execution = await controller.executeTool(workspaceId, userId, {
    arguments: { query: "brief" },
    name: "gdrive_search",
  });
  assert.ok(execution instanceof IntegrationMcpToolExecutionDto);
  assert.equal(execution.name, "gdrive_search");
  assert.deepEqual(execution.result, { files: [], kind: "google_drive_search_results" });
  assert.deepEqual(calls, [
    { actualUserId: userId, actualWorkspaceId: workspaceId, kind: "list" },
    { actualUserId: userId, actualWorkspaceId: workspaceId, kind: "list" },
    {
      actualUserId: userId,
      actualWorkspaceId: workspaceId,
      input: { arguments: { query: "brief" }, name: "gdrive_search" },
      kind: "execute",
    },
  ]);
});
