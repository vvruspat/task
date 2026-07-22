import assert from "node:assert/strict";
import test from "node:test";
import {
  createIntegrationConnectionsSql,
  dropIntegrationConnectionsSql,
} from "./1783298040000-create-integration-connections.js";

test("integration connection migration stores only encrypted secrets and opaque references", () => {
  const sql = createIntegrationConnectionsSql.join("\n");

  assert.match(sql, /CREATE TABLE "integration_secrets"/u);
  assert.match(sql, /"algorithm" text NOT NULL DEFAULT 'aes-256-gcm'/u);
  assert.match(sql, /CREATE TABLE "integration_connections"/u);
  assert.match(sql, /"secret_reference" text NOT NULL/u);
  assert.match(sql, /UNIQUE \("workspace_integration_id"\)/u);
  assert.match(sql, /CREATE TABLE "integration_oauth_states"/u);
  assert.match(sql, /UNIQUE \("state_hash"\)/u);
  assert.deepEqual(dropIntegrationConnectionsSql, [
    'DROP TABLE "integration_oauth_states"',
    'DROP TABLE "integration_connections"',
    'DROP TABLE "integration_secrets"',
  ]);
});
