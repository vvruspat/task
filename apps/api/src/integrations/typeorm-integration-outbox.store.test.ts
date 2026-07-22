import assert from "node:assert/strict";
import test from "node:test";
import { defineIntegrationPlugin } from "@task/integration-sdk";
import { pluginConsumesEvent } from "./typeorm-integration-outbox.store.js";

const plugin = defineIntegrationPlugin({
  apiVersion: 1,
  auth: { kind: "oauth2", scopes: ["files.read"] },
  capabilities: [
    {
      eventNames: ["attachment.created.v1", "task.created.v1"],
      kind: "domain_event_consumer",
    },
  ],
  description: "Test file plugin",
  iconKey: "test-files",
  name: "Test files",
  pluginKey: "test-files",
  pluginVersion: "1.0.0",
});

test("fan-out targets only events declared by a plugin", () => {
  assert.equal(pluginConsumesEvent(plugin, "attachment.created.v1"), true);
  assert.equal(pluginConsumesEvent(plugin, "task.updated.v1"), false);
});
