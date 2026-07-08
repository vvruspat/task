import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createAgentRunTablesSql = [
  `CREATE TABLE "agent_runs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "source" text NOT NULL,
    "source_thread_id" text,
    "source_message_id" text,
    "model" text,
    "input_text" text NOT NULL,
    "normalized_intent" jsonb,
    "final_response" text,
    "status" text NOT NULL,
    "token_usage" jsonb,
    "cost" jsonb,
    "error" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_agent_runs_source" CHECK ("source" IN ('telegram', 'web', 'mini_app')),
    CONSTRAINT "chk_agent_runs_status" CHECK ("status" IN ('running', 'waiting_confirmation', 'completed', 'failed')),
    CONSTRAINT "fk_agent_runs_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_agent_runs_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
  )`,
  `CREATE TABLE "agent_tool_calls" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "agent_run_id" uuid NOT NULL,
    "tool_name" text NOT NULL,
    "arguments" jsonb NOT NULL,
    "result" jsonb,
    "status" text NOT NULL,
    "error" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "completed_at" timestamptz,
    CONSTRAINT "chk_agent_tool_calls_status" CHECK ("status" IN ('pending', 'success', 'error')),
    CONSTRAINT "fk_agent_tool_calls_agent_run_id" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs" ("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX "idx_agent_runs_workspace_id_created_at" ON "agent_runs" ("workspace_id", "created_at")`,
  `CREATE INDEX "idx_agent_runs_workspace_id_user_id" ON "agent_runs" ("workspace_id", "user_id")`,
  `CREATE INDEX "idx_agent_runs_workspace_id_status" ON "agent_runs" ("workspace_id", "status")`,
  `CREATE UNIQUE INDEX "uq_agent_runs_telegram_source_message" ON "agent_runs" ("workspace_id", "user_id", "source", "source_thread_id", "source_message_id") WHERE "source_thread_id" IS NOT NULL AND "source_message_id" IS NOT NULL`,
  `CREATE INDEX "idx_agent_tool_calls_agent_run_id_created_at" ON "agent_tool_calls" ("agent_run_id", "created_at")`,
  `CREATE INDEX "idx_agent_tool_calls_agent_run_id_status" ON "agent_tool_calls" ("agent_run_id", "status")`,
] as const;

export const dropAgentRunTablesSql = [
  `DROP INDEX "idx_agent_tool_calls_agent_run_id_status"`,
  `DROP INDEX "idx_agent_tool_calls_agent_run_id_created_at"`,
  `DROP INDEX "uq_agent_runs_telegram_source_message"`,
  `DROP INDEX "idx_agent_runs_workspace_id_status"`,
  `DROP INDEX "idx_agent_runs_workspace_id_user_id"`,
  `DROP INDEX "idx_agent_runs_workspace_id_created_at"`,
  `DROP TABLE "agent_tool_calls"`,
  `DROP TABLE "agent_runs"`,
] as const;

export class CreateAgentRunTables1783296420000 implements MigrationInterface {
  name = "CreateAgentRunTables1783296420000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createAgentRunTablesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropAgentRunTablesSql);
  }
}
