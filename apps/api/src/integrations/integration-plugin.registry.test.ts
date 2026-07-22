import assert from "node:assert/strict";
import test from "node:test";
import { defineIntegrationPlugin } from "@task/integration-sdk";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import {
  createGoogleDriveIntegrationPlugin,
  googleDriveIntegrationPlugin,
} from "./plugins/google-drive.integration-plugin.js";
import { telegramIntegrationPlugin } from "./plugins/telegram.integration-plugin.js";

test("integration registry exposes first-party plugins in display order", () => {
  const registry = new IntegrationPluginRegistry([
    telegramIntegrationPlugin,
    googleDriveIntegrationPlugin,
  ]);

  assert.deepEqual(
    registry.list().map((plugin) => plugin.manifest.pluginKey),
    ["google-drive", "telegram"],
  );
  assert.equal(registry.get("telegram"), telegramIntegrationPlugin);
  assert.equal(registry.get("missing"), null);
});

test("integration registry rejects duplicate plugin keys", () => {
  const duplicate = defineIntegrationPlugin({
    ...telegramIntegrationPlugin.manifest,
    name: "Duplicate Telegram",
  });

  assert.throws(
    () => new IntegrationPluginRegistry([telegramIntegrationPlugin, duplicate]),
    /Duplicate integration plugin key: telegram/u,
  );
});

test("integration registry rejects duplicate capability kinds", () => {
  const invalid = defineIntegrationPlugin({
    ...telegramIntegrationPlugin.manifest,
    capabilities: [{ kind: "webhook_handler" }, { kind: "webhook_handler" }],
    pluginKey: "invalid-telegram",
  });

  assert.throws(
    () => new IntegrationPluginRegistry([invalid]),
    /declares webhook_handler more than once/u,
  );
});

test("Google Drive plugin factory binds its domain-event handler", async () => {
  const handled: string[] = [];
  const plugin = createGoogleDriveIntegrationPlugin(async (event) => {
    handled.push(event.id);
  });
  const handler = plugin.handlers?.handleDomainEvent;
  assert.notEqual(handler, undefined);
  if (handler === undefined) return;
  await handler(
    {
      actorUserId: null,
      entity: { id: "task-id", type: "task" },
      id: "event-id",
      name: "task.created.v1",
      occurredAt: "2026-07-22T12:00:00.000Z",
      payload: {},
      workspaceId: "workspace-id",
    },
    {
      attempt: 1,
      idempotencyKey: "event-id:installation-id",
      installationId: "installation-id",
      pluginKey: "google-drive",
      pluginVersion: "0.1.0",
    },
  );
  assert.deepEqual(handled, ["event-id"]);
});
