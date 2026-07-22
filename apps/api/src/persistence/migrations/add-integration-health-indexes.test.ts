import assert from "node:assert/strict";
import test from "node:test";
import {
  addIntegrationHealthIndexesQueries,
  dropIntegrationHealthIndexesQueries,
} from "./1783298280000-add-integration-health-indexes.js";

test("integration health aggregation has indexes for every grouped status query", () => {
  const sql = addIntegrationHealthIndexesQueries.join("\n");

  assert.match(sql, /integration_subscriptions.*connection_id.*status/u);
  assert.match(sql, /integration_event_deliveries.*workspace_integration_id.*status/u);
  assert.match(sql, /integration_webhook_receipts.*workspace_integration_id.*status/u);
});

test("integration health indexes migration is reversible", () => {
  assert.equal(
    dropIntegrationHealthIndexesQueries.length,
    addIntegrationHealthIndexesQueries.length,
  );
  assert.match(dropIntegrationHealthIndexesQueries[0], /webhook_receipts/u);
});
