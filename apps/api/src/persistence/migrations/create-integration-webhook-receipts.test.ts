import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntegrationWebhookReceiptsQueries,
  dropIntegrationWebhookReceiptsQueries,
} from "./1783298160000-create-integration-webhook-receipts.js";

test("integration webhook receipts persist deduplicated delivery audit", () => {
  const sql = createIntegrationWebhookReceiptsQueries.join("\n");
  assert.match(sql, /CREATE TABLE "integration_webhook_receipts"/u);
  assert.match(sql, /UNIQUE INDEX "uq_integration_webhook_receipts_plugin_event"/u);
  assert.match(sql, /"status" IN \('received', 'processing', 'processed', 'ignored', 'failed'\)/u);
  assert.doesNotMatch(sql, /channel_token|authorization|secret_reference/iu);
});

test("integration webhook receipt rollback drops indexes before the table", () => {
  assert.equal(
    dropIntegrationWebhookReceiptsQueries.at(-1),
    `DROP TABLE "integration_webhook_receipts"`,
  );
});
