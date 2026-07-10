import assert from "node:assert/strict";
import test from "node:test";
import {
  createAgentRunTablesSql,
  dropAgentRunTablesSql,
} from "./1783296420000-create-agent-run-tables.js";

test("agent run migration creates run table before tool call table", () => {
  const createTableStatements = createAgentRunTablesSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["agent_runs", "agent_tool_calls"]);
});

test("agent run migration includes expected agent_runs columns and constraints", () => {
  const sql = createAgentRunTablesSql.join("\n");

  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"user_id" uuid NOT NULL/);
  assert.match(sql, /"source" text NOT NULL/);
  assert.doesNotMatch(sql, /"source_thread_id" text/);
  assert.match(sql, /"input_text" text NOT NULL/);
  assert.match(sql, /"normalized_intent" jsonb/);
  assert.match(sql, /"token_usage" jsonb/);
  assert.match(sql, /"cost" jsonb/);
  assert.match(
    sql,
    /CONSTRAINT "chk_agent_runs_source" CHECK \("source" IN \('telegram', 'web', 'mini_app'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "chk_agent_runs_status" CHECK \("status" IN \('running', 'waiting_confirmation', 'completed', 'failed'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_agent_runs_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_agent_runs_user_id" FOREIGN KEY \("user_id"\) REFERENCES "users" \("id"\) ON DELETE RESTRICT/,
  );
});

test("agent run migration includes expected agent_tool_calls columns and constraints", () => {
  const sql = createAgentRunTablesSql.join("\n");

  assert.match(sql, /CREATE TABLE "agent_tool_calls"/);
  assert.match(sql, /"agent_run_id" uuid NOT NULL/);
  assert.match(sql, /"tool_name" text NOT NULL/);
  assert.match(sql, /"arguments" jsonb NOT NULL/);
  assert.match(sql, /"result" jsonb/);
  assert.match(sql, /"completed_at" timestamptz/);
  assert.match(
    sql,
    /CONSTRAINT "chk_agent_tool_calls_status" CHECK \("status" IN \('pending', 'success', 'error'\)\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_agent_tool_calls_agent_run_id" FOREIGN KEY \("agent_run_id"\) REFERENCES "agent_runs" \("id"\) ON DELETE CASCADE/,
  );
});

test("agent run migration includes run and tool call lookup indexes", () => {
  const sql = createAgentRunTablesSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_agent_runs_workspace_id_created_at" ON "agent_runs" \("workspace_id", "created_at"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_agent_runs_workspace_id_user_id" ON "agent_runs" \("workspace_id", "user_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_agent_runs_workspace_id_status" ON "agent_runs" \("workspace_id", "status"\)/,
  );
  assert.doesNotMatch(
    sql,
    /CREATE UNIQUE INDEX "uq_agent_runs_telegram_source_message" ON "agent_runs" \("workspace_id", "user_id", "source", "source_thread_id", "source_message_id"\) WHERE "source_thread_id" IS NOT NULL AND "source_message_id" IS NOT NULL/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_agent_tool_calls_agent_run_id_created_at" ON "agent_tool_calls" \("agent_run_id", "created_at"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_agent_tool_calls_agent_run_id_status" ON "agent_tool_calls" \("agent_run_id", "status"\)/,
  );
});

test("agent run migration down queries drop indexes and child table first", () => {
  assert.deepEqual(dropAgentRunTablesSql, [
    `DROP INDEX "idx_agent_tool_calls_agent_run_id_status"`,
    `DROP INDEX "idx_agent_tool_calls_agent_run_id_created_at"`,
    `DROP INDEX "idx_agent_runs_workspace_id_status"`,
    `DROP INDEX "idx_agent_runs_workspace_id_user_id"`,
    `DROP INDEX "idx_agent_runs_workspace_id_created_at"`,
    `DROP TABLE "agent_tool_calls"`,
    `DROP TABLE "agent_runs"`,
  ]);
});
