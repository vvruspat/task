import assert from "node:assert/strict";
import test from "node:test";
import {
  createConfirmationRequestsTableSql,
  dropConfirmationRequestsTableSql,
} from "./1783296480000-create-confirmation-requests-table.js";

test("confirmation request migration adds agent run tenant key before creating requests", () => {
  assert.deepEqual(
    createConfirmationRequestsTableSql.map(
      (query) => query.match(/^(ALTER TABLE|CREATE TABLE|CREATE INDEX) "([^"]+)"/)?.[2],
    ),
    [
      "agent_runs",
      "confirmation_requests",
      "idx_confirmation_requests_workspace_id_user_id_status",
      "idx_confirmation_requests_agent_run_id",
      "idx_confirmation_requests_workspace_id_expires_at",
    ],
  );
});

test("confirmation request migration includes expected columns and constraints", () => {
  const sql = createConfirmationRequestsTableSql.join("\n");

  assert.match(
    sql,
    /ALTER TABLE "agent_runs" ADD CONSTRAINT "uq_agent_runs_id_workspace_id" UNIQUE \("id", "workspace_id"\)/,
  );
  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"agent_run_id" uuid NOT NULL/);
  assert.match(sql, /"user_id" uuid NOT NULL/);
  assert.match(sql, /"kind" text NOT NULL/);
  assert.match(sql, /"preview" jsonb NOT NULL/);
  assert.match(sql, /"expires_at" timestamptz NOT NULL/);
  assert.match(
    sql,
    /CONSTRAINT "chk_confirmation_requests_status" CHECK \("status" IN \('pending', 'confirmed', 'cancelled', 'expired'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_confirmation_requests_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_confirmation_requests_agent_run_workspace" FOREIGN KEY \("agent_run_id", "workspace_id"\) REFERENCES "agent_runs" \("id", "workspace_id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_confirmation_requests_user_id" FOREIGN KEY \("user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
});

test("confirmation request migration includes lookup and expiry indexes", () => {
  const sql = createConfirmationRequestsTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_confirmation_requests_workspace_id_user_id_status" ON "confirmation_requests" \("workspace_id", "user_id", "status"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_confirmation_requests_agent_run_id" ON "confirmation_requests" \("agent_run_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_confirmation_requests_workspace_id_expires_at" ON "confirmation_requests" \("workspace_id", "expires_at"\)/,
  );
});

test("confirmation request migration down queries drop dependent objects first", () => {
  assert.deepEqual(dropConfirmationRequestsTableSql, [
    `DROP INDEX "idx_confirmation_requests_workspace_id_expires_at"`,
    `DROP INDEX "idx_confirmation_requests_agent_run_id"`,
    `DROP INDEX "idx_confirmation_requests_workspace_id_user_id_status"`,
    `DROP TABLE "confirmation_requests"`,
    `ALTER TABLE "agent_runs" DROP CONSTRAINT "uq_agent_runs_id_workspace_id"`,
  ]);
});
