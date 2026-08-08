import assert from "node:assert/strict";
import test from "node:test";
import { summarizeIntegrationConnections } from "./typeorm-workspace-integrations.store.js";

test("connection health is connected when any connection is active", () => {
  assert.deepEqual(
    summarizeIntegrationConnections([
      { lastError: null, status: "disconnected" },
      { lastError: null, status: "connected" },
    ]),
    { lastError: null, status: "connected" },
  );
});

test("connection health surfaces an error from any connection", () => {
  assert.deepEqual(
    summarizeIntegrationConnections([
      { lastError: null, status: "connected" },
      { lastError: "revoked", status: "error" },
    ]),
    { lastError: "revoked", status: "error" },
  );
});

test("connection health is missing without provider connections", () => {
  assert.equal(summarizeIntegrationConnections([]), null);
});
