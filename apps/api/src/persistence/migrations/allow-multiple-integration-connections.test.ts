import assert from "node:assert/strict";
import test from "node:test";
import {
  allowMultipleIntegrationConnectionsQueries,
  restoreSingleIntegrationConnectionQueries,
} from "./1783298340000-allow-multiple-integration-connections.js";

test("multiple integration connections are unique per provider account", () => {
  const sql = allowMultipleIntegrationConnectionsQueries.join("\n");

  assert.match(sql, /DROP CONSTRAINT "uq_integration_connections_workspace_integration"/u);
  assert.match(
    sql,
    /UNIQUE INDEX "uq_integration_connections_installation_provider_account".*"workspace_integration_id", "provider_account_id"/u,
  );
});

test("multiple integration connection migration is reversible", () => {
  assert.deepEqual(restoreSingleIntegrationConnectionQueries, [
    'DROP INDEX "uq_integration_connections_installation_provider_account"',
    'ALTER TABLE "integration_connections" ADD CONSTRAINT "uq_integration_connections_workspace_integration" UNIQUE ("workspace_integration_id")',
  ]);
});
