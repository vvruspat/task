import assert from "node:assert/strict";
import test from "node:test";
import type { IntegrationDomainEvent } from "@task/integration-sdk";
import { parseIntegrationEventOccurredAt } from "./integration-outbox.publisher.js";

const event: IntegrationDomainEvent = {
  actorUserId: null,
  entity: { id: "33333333-3333-4333-8333-333333333333", type: "workspace_integration" },
  id: "44444444-4444-4444-8444-444444444444",
  name: "integration.connected.v1",
  occurredAt: "not-a-date",
  payload: {},
  workspaceId: "11111111-1111-4111-8111-111111111111",
};

test("publisher rejects malformed event timestamps before writing", () => {
  assert.throws(() => parseIntegrationEventOccurredAt(event), /invalid occurredAt/u);
});
