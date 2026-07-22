import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntegrationResourcesSql,
  dropIntegrationResourcesSql,
} from "./1783298100000-create-integration-resources.js";

test("integration resource migration creates provider-neutral resource state", () => {
  const sql = createIntegrationResourcesSql.join("\n");

  assert.match(sql, /CREATE TABLE "integration_external_resources"/);
  assert.match(sql, /CREATE TABLE "integration_resource_links"/);
  assert.match(sql, /CREATE TABLE "integration_resource_references"/);
  assert.match(sql, /CREATE TABLE "integration_subscriptions"/);
  assert.match(sql, /UNIQUE INDEX "uq_integration_external_resources_connection_provider_id"/);
  assert.match(sql, /"target_type" IN \('workspace', 'task', 'comment', 'attachment'\)/);
  assert.match(sql, /"relation" IN \('managed_root', 'managed_container', 'reference', 'export'\)/);
  assert.match(sql, /"url_hash" ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(sql, /"callback_secret_reference" text/);
  assert.doesNotMatch(sql, /refresh_token|access_token|client_secret/i);
});

test("integration resource migration drops dependants before resources", () => {
  assert.deepEqual(dropIntegrationResourcesSql, [
    `DROP TABLE "integration_subscriptions"`,
    `DROP TABLE "integration_resource_references"`,
    `DROP TABLE "integration_resource_links"`,
    `DROP TABLE "integration_external_resources"`,
  ]);
});
