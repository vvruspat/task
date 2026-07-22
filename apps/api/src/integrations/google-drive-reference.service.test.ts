import assert from "node:assert/strict";
import test from "node:test";
import type { IntegrationDomainEvent } from "@task/integration-sdk";
import { referenceSourceForEvent } from "./google-drive-reference.service.js";

const baseEvent: IntegrationDomainEvent = {
  actorUserId: null,
  entity: { id: "source-id", type: "task" },
  id: "event-id",
  name: "task.updated.v1",
  occurredAt: "2026-07-22T12:00:00.000Z",
  payload: {},
  workspaceId: "workspace-id",
};

test("Google Drive reference scanning routes task and comment source events", () => {
  assert.deepEqual(referenceSourceForEvent(baseEvent), {
    id: "source-id",
    sourceType: "task_description",
  });
  assert.deepEqual(
    referenceSourceForEvent({
      ...baseEvent,
      entity: { id: "comment-id", type: "comment" },
      name: "comment.created.v1",
    }),
    { id: "comment-id", sourceType: "comment" },
  );
  assert.equal(referenceSourceForEvent({ ...baseEvent, name: "attachment.created.v1" }), null);
});
