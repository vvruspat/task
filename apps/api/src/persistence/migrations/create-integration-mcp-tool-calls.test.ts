import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntegrationMcpToolCallsQueries,
  dropIntegrationMcpToolCallsQueries,
} from "./1783298220000-create-integration-mcp-tool-calls.js";

test("integration MCP tool calls persist workspace-scoped audit data", () => {
  const sql = createIntegrationMcpToolCallsQueries.join("\n");
  assert.match(sql, /CREATE TABLE "integration_mcp_tool_calls"/u);
  assert.match(sql, /FOREIGN KEY \("workspace_id"\)/u);
  assert.match(sql, /FOREIGN KEY \("user_id"\)/u);
  assert.match(sql, /"status" IN \('running', 'success', 'error'\)/u);
  assert.doesNotMatch(sql, /access_token|refresh_token|secret_reference/iu);
});

test("integration MCP tool-call rollback drops indexes before the table", () => {
  assert.equal(
    dropIntegrationMcpToolCallsQueries.at(-1),
    `DROP TABLE "integration_mcp_tool_calls"`,
  );
});
