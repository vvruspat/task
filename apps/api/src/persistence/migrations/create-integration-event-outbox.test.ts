import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntegrationEventOutboxSql,
  dropIntegrationEventOutboxSql,
} from "./1783297980000-create-integration-event-outbox.js";

test("integration outbox migration atomically projects activity events", () => {
  const sql = createIntegrationEventOutboxSql.join("\n");

  assert.match(sql, /CREATE TABLE "integration_outbox_events"/u);
  assert.match(sql, /CREATE TABLE "integration_event_deliveries"/u);
  assert.match(sql, /UNIQUE \("outbox_event_id", "workspace_integration_id"\)/u);
  assert.match(sql, /AFTER INSERT ON "activity_events"/u);
  assert.match(sql, /NEW\.payload \|\| jsonb_build_object\('activityEventType'/u);
  assert.match(sql, /WHEN NEW\.event_type LIKE 'task\.%' THEN 'task\.updated\.v1'/u);
  assert.deepEqual(dropIntegrationEventOutboxSql, [
    'DROP TRIGGER "trg_activity_events_integration_outbox" ON "activity_events"',
    'DROP FUNCTION "enqueue_integration_activity_event"()',
    'DROP TABLE "integration_event_deliveries"',
    'DROP TABLE "integration_outbox_events"',
  ]);
});
