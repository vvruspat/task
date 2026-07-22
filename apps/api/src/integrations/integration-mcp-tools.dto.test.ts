import assert from "node:assert/strict";
import test from "node:test";
import { ParseExecuteIntegrationMcpToolBodyPipe } from "./integration-mcp-tools.dto.js";

test("integration MCP tool input is runtime validated", () => {
  const pipe = new ParseExecuteIntegrationMcpToolBodyPipe();

  assert.deepEqual(pipe.transform({ arguments: { query: "brief" }, name: "gdrive_search" }), {
    arguments: { query: "brief" },
    name: "gdrive_search",
  });
  assert.throws(() => pipe.transform({ arguments: {}, name: "Invalid tool" }), /name is invalid/u);
  assert.throws(
    () => pipe.transform({ arguments: { createdAt: new Date() }, name: "gdrive_get" }),
    /bounded JSON object/u,
  );
  assert.throws(
    () => pipe.transform({ arguments: {}, name: "gdrive_get", workspaceId: "untrusted" }),
    /must be an object/u,
  );
});
