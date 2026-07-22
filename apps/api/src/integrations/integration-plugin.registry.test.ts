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

test("integration registry rejects duplicate agent tool namespaces", () => {
  const duplicateNamespace = defineIntegrationPlugin({
    ...telegramIntegrationPlugin.manifest,
    capabilities: [{ kind: "agent_tool_provider", namespace: "gdrive" }],
    pluginKey: "duplicate-namespace",
  });

  assert.throws(
    () => new IntegrationPluginRegistry([googleDriveIntegrationPlugin, duplicateNamespace]),
    /Duplicate integration agent tool namespace gdrive/u,
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

test("integration registry validates namespaced agent tool providers", () => {
  const plugin = defineIntegrationPlugin(
    {
      ...googleDriveIntegrationPlugin.manifest,
      capabilities: [{ kind: "agent_tool_provider", namespace: "gdrive" }],
    },
    {
      agentTools: {
        tools: [
          {
            description: "Find Drive files.",
            inputSchema: {
              additionalProperties: false,
              properties: { query: { minLength: 1, type: "string" } },
              required: ["query"],
              type: "object",
            },
            name: "search",
            readOnly: true,
          },
        ],
        async execute(): Promise<Record<string, unknown>> {
          return {};
        },
      },
    },
  );

  assert.equal(new IntegrationPluginRegistry([plugin]).get("google-drive"), plugin);
  const provider = plugin.handlers?.agentTools;
  const tool = provider?.tools[0];
  if (provider === undefined || tool === undefined) {
    throw new Error("Expected the test plugin to expose one agent tool.");
  }
  assert.throws(
    () =>
      new IntegrationPluginRegistry([
        defineIntegrationPlugin(
          {
            ...plugin.manifest,
            pluginKey: "invalid-tools",
          },
          {
            agentTools: {
              ...provider,
              tools: [
                {
                  ...tool,
                  description: "Invalid tool.",
                  inputSchema: {
                    additionalProperties: false,
                    properties: {},
                    type: "object",
                  },
                  name: "Invalid tool name",
                  readOnly: true,
                },
              ],
              async execute(): Promise<Record<string, unknown>> {
                return {};
              },
            },
          },
        ),
      ]),
    /invalid agent tool name/u,
  );
  assert.throws(
    () =>
      new IntegrationPluginRegistry([
        defineIntegrationPlugin(
          { ...plugin.manifest, pluginKey: "invalid-schema" },
          {
            agentTools: {
              ...provider,
              tools: [
                {
                  ...tool,
                  inputSchema: { ...tool.inputSchema, required: ["missing"] },
                },
              ],
            },
          },
        ),
      ]),
    /invalid required properties/u,
  );
});
