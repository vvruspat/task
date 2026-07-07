import assert from "node:assert/strict";
import test from "node:test";
import { InvalidTaskMcpEnvironmentError, parseTaskMcpConfig } from "./config.js";

test("parseTaskMcpConfig accepts a backend base URL", () => {
  const config = parseTaskMcpConfig({
    TASK_API_BASE_URL: "https://api.example.test/",
  });

  assert.deepEqual(config, {
    backendBaseUrl: "https://api.example.test",
    name: "task-mcp-server",
    version: "0.0.0",
  });
});

test("parseTaskMcpConfig accepts explicit server metadata", () => {
  const config = parseTaskMcpConfig({
    TASK_API_BASE_URL: "http://localhost:3000",
    TASK_MCP_SERVER_NAME: "task-local",
    TASK_MCP_SERVER_VERSION: "1.2.3",
  });

  assert.deepEqual(config, {
    backendBaseUrl: "http://localhost:3000",
    name: "task-local",
    version: "1.2.3",
  });
});

test("parseTaskMcpConfig rejects invalid backend base URLs", () => {
  assert.throws(() => parseTaskMcpConfig({}), InvalidTaskMcpEnvironmentError);

  const invalidBaseUrls = ["", " http://localhost:3000", "postgresql://localhost/task", "http://"];

  for (const backendBaseUrl of invalidBaseUrls) {
    assert.throws(
      () =>
        parseTaskMcpConfig({
          TASK_API_BASE_URL: backendBaseUrl,
        }),
      InvalidTaskMcpEnvironmentError,
    );
  }
});

test("parseTaskMcpConfig redacts invalid backend base URL values", () => {
  assert.throws(
    () =>
      parseTaskMcpConfig({
        TASK_API_BASE_URL: "postgresql://task_user:task_password@localhost/task_db",
      }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidTaskMcpEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /task_user/);
      assert.doesNotMatch(error.message, /task_password/);
      return true;
    },
  );
});

test("parseTaskMcpConfig rejects empty server metadata", () => {
  assert.throws(
    () =>
      parseTaskMcpConfig({
        TASK_API_BASE_URL: "http://localhost:3000",
        TASK_MCP_SERVER_NAME: "",
      }),
    InvalidTaskMcpEnvironmentError,
  );
  assert.throws(
    () =>
      parseTaskMcpConfig({
        TASK_API_BASE_URL: "http://localhost:3000",
        TASK_MCP_SERVER_VERSION: " 1.0.0",
      }),
    InvalidTaskMcpEnvironmentError,
  );
});
