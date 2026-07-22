import assert from "node:assert/strict";
import test from "node:test";
import { defineIntegrationPlugin } from "@task/integration-sdk";
import {
  IntegrationAgentToolsService,
  qualifyIntegrationAgentToolName,
} from "./integration-agent-tools.service.js";
import type { IntegrationAgentToolsStore } from "./integration-agent-tools.store.js";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";

const installation = {
  installationId: "00000000-0000-4000-8000-000000000001",
  pluginKey: "test-drive",
  pluginVersion: "1.0.0",
  workspaceId: "00000000-0000-4000-8000-000000000002",
};

test("workspace integration agent tools are namespaced and execute with trusted context", async () => {
  const executions: Array<{ name: string; userId: string; workspaceId: string }> = [];
  const plugin = defineIntegrationPlugin(
    {
      apiVersion: 1,
      auth: { kind: "oauth2", scopes: [] },
      capabilities: [{ kind: "agent_tool_provider", namespace: "drive" }],
      description: "Test Drive plugin.",
      iconKey: "drive",
      name: "Test Drive",
      pluginKey: installation.pluginKey,
      pluginVersion: installation.pluginVersion,
    },
    {
      agentTools: {
        tools: [
          {
            description: "Search files.",
            inputSchema: {
              additionalProperties: false,
              properties: { query: { type: "string" } },
              required: ["query"],
              type: "object",
            },
            name: "search",
            readOnly: true,
          },
        ],
        async execute(call, context): Promise<Record<string, unknown>> {
          executions.push({
            name: call.name,
            userId: context.userId,
            workspaceId: context.workspaceId,
          });
          return { query: call.arguments["query"] };
        },
      },
    },
  );
  const store: IntegrationAgentToolsStore = {
    async listConnected(): Promise<readonly [typeof installation]> {
      return [installation];
    },
  };
  const service = new IntegrationAgentToolsService(store, new IntegrationPluginRegistry([plugin]));

  assert.deepEqual(
    (await service.listTools(installation.workspaceId, "user-id")).map((tool) => tool.name),
    ["drive_search"],
  );
  assert.deepEqual(
    await service.executeTool(
      { arguments: { query: "brief" }, name: "drive_search" },
      installation.workspaceId,
      "user-id",
    ),
    { query: "brief" },
  );
  assert.deepEqual(executions, [
    { name: "search", userId: "user-id", workspaceId: installation.workspaceId },
  ]);
  assert.equal(qualifyIntegrationAgentToolName("drive", "get"), "drive_get");
});

test("workspace integration tools stay hidden without non-guest membership", async () => {
  const store: IntegrationAgentToolsStore = {
    async listConnected(): Promise<null> {
      return null;
    },
  };
  const service = new IntegrationAgentToolsService(store, new IntegrationPluginRegistry([]));

  assert.deepEqual(await service.listTools(installation.workspaceId, "guest-id"), []);
  await assert.rejects(
    service.executeTool(
      { arguments: {}, name: "drive_search" },
      installation.workspaceId,
      "guest-id",
    ),
    /cannot use workspace integration tools/u,
  );
});
