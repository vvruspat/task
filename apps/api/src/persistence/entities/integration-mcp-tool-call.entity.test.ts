import assert from "node:assert/strict";
import test from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import { IntegrationMcpToolCallEntity } from "./integration-mcp-tool-call.entity.js";

test("integration MCP tool-call entity registers audit metadata", () => {
  const storage = getMetadataArgsStorage();
  const table = storage.tables.find(
    (candidate) => candidate.target === IntegrationMcpToolCallEntity,
  );
  const checks = storage.checks
    .filter((check) => check.target === IntegrationMcpToolCallEntity)
    .map((check) => check.name);
  const indexes = storage.indices
    .filter((index) => index.target === IntegrationMcpToolCallEntity)
    .map((index) => index.name)
    .sort();

  assert.equal(table?.name, "integration_mcp_tool_calls");
  assert.deepEqual(checks, ["chk_integration_mcp_tool_calls_status"]);
  assert.deepEqual(indexes, [
    "idx_integration_mcp_tool_calls_status_created",
    "idx_integration_mcp_tool_calls_user_created",
    "idx_integration_mcp_tool_calls_workspace_created",
  ]);
  assert.match(
    new IntegrationMcpToolCallEntity().id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );
});
