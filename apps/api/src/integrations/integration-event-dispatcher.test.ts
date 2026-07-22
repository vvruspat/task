import assert from "node:assert/strict";
import test from "node:test";
import {
  defineIntegrationPlugin,
  type IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import { IntegrationEventDispatcher } from "./integration-event-dispatcher.js";
import type { ClaimedIntegrationDelivery } from "./integration-outbox.contracts.js";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";

const claimedDelivery: ClaimedIntegrationDelivery = {
  delivery: {
    attemptCount: 2,
    availableAt: new Date("2026-07-22T10:00:00.000Z"),
    createdAt: new Date("2026-07-22T10:00:00.000Z"),
    id: "55555555-5555-4555-8555-555555555555",
    lastError: null,
    lockedAt: new Date("2026-07-22T10:00:00.000Z"),
    lockToken: "66666666-6666-4666-8666-666666666666",
    outboxEventId: "33333333-3333-4333-8333-333333333333",
    pluginKey: "test-plugin",
    pluginVersion: "1.0.0",
    processedAt: null,
    status: "processing",
    updatedAt: new Date("2026-07-22T10:00:00.000Z"),
    workspaceIntegrationId: "44444444-4444-4444-8444-444444444444",
  },
  event: {
    actorUserId: "22222222-2222-4222-8222-222222222222",
    entity: { id: "77777777-7777-4777-8777-777777777777", type: "task" },
    id: "33333333-3333-4333-8333-333333333333",
    name: "task.updated.v1",
    occurredAt: "2026-07-22T10:00:00.000Z",
    payload: { activityEventType: "task.status_updated" },
    workspaceId: "11111111-1111-4111-8111-111111111111",
  },
};

test("dispatcher supplies a stable idempotency key and delivery context", async () => {
  let receivedContext: IntegrationDomainEventHandlerContext | null = null;
  const plugin = defineIntegrationPlugin(
    {
      apiVersion: 1,
      auth: { kind: "app_installation", scopes: [] },
      capabilities: [{ kind: "domain_event_consumer", eventNames: ["task.updated.v1"] }],
      description: "Test plugin",
      iconKey: "test",
      name: "Test",
      pluginKey: "test-plugin",
      pluginVersion: "1.0.0",
    },
    {
      handleDomainEvent: async (_event, context): Promise<void> => {
        receivedContext = context;
      },
    },
  );
  const dispatcher = new IntegrationEventDispatcher(new IntegrationPluginRegistry([plugin]));

  await dispatcher.dispatch(claimedDelivery);

  assert.deepEqual(receivedContext, {
    attempt: 2,
    idempotencyKey: "33333333-3333-4333-8333-333333333333:44444444-4444-4444-8444-444444444444",
    installationId: "44444444-4444-4444-8444-444444444444",
    pluginKey: "test-plugin",
    pluginVersion: "1.0.0",
  });
});

test("dispatcher rejects a delivery for an unavailable plugin version", async () => {
  const plugin = defineIntegrationPlugin({
    apiVersion: 1,
    auth: { kind: "app_installation", scopes: [] },
    capabilities: [],
    description: "Test plugin",
    iconKey: "test",
    name: "Test",
    pluginKey: "test-plugin",
    pluginVersion: "2.0.0",
  });
  const dispatcher = new IntegrationEventDispatcher(new IntegrationPluginRegistry([plugin]));

  await assert.rejects(dispatcher.dispatch(claimedDelivery), /version 1\.0\.0 is not available/u);
});
