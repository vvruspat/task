import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addAgentRunSourceThreadIdSql = [
  `ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS "source_thread_id" text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_runs_telegram_source_message" ON "agent_runs" ("workspace_id", "user_id", "source", "source_thread_id", "source_message_id") WHERE "source_thread_id" IS NOT NULL AND "source_message_id" IS NOT NULL`,
] as const;

export const dropAgentRunSourceThreadIdSql = [
  `DROP INDEX "uq_agent_runs_telegram_source_message"`,
  `ALTER TABLE "agent_runs" DROP COLUMN "source_thread_id"`,
] as const;

export class AddAgentRunSourceThreadId1783296660000 implements MigrationInterface {
  name = "AddAgentRunSourceThreadId1783296660000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addAgentRunSourceThreadIdSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropAgentRunSourceThreadIdSql);
  }
}
