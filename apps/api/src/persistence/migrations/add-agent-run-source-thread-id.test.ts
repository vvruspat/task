import assert from "node:assert/strict";
import test from "node:test";
import {
  addAgentRunSourceThreadIdSql,
  dropAgentRunSourceThreadIdSql,
} from "./1783296660000-add-agent-run-source-thread-id.js";

test("agent run source thread migration adds retry-safe Telegram lookup fields", () => {
  assert.deepEqual(addAgentRunSourceThreadIdSql, [
    `ALTER TABLE "agent_runs" ADD COLUMN "source_thread_id" text`,
    `CREATE UNIQUE INDEX "uq_agent_runs_telegram_source_message" ON "agent_runs" ("workspace_id", "user_id", "source", "source_thread_id", "source_message_id") WHERE "source_thread_id" IS NOT NULL AND "source_message_id" IS NOT NULL`,
  ]);
});

test("agent run source thread migration down queries drop index before column", () => {
  assert.deepEqual(dropAgentRunSourceThreadIdSql, [
    `DROP INDEX "uq_agent_runs_telegram_source_message"`,
    `ALTER TABLE "agent_runs" DROP COLUMN "source_thread_id"`,
  ]);
});
