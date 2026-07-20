import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addCommentAgentRunSql = [
  `ALTER TABLE "comments" ADD COLUMN "agent_run_id" uuid`,
  `ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_agent_run_id" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs" ("id") ON DELETE SET NULL`,
  `CREATE INDEX "idx_comments_agent_run_id" ON "comments" ("agent_run_id")`,
] as const;

export const dropCommentAgentRunSql = [
  `DROP INDEX "idx_comments_agent_run_id"`,
  `ALTER TABLE "comments" DROP CONSTRAINT "fk_comments_agent_run_id"`,
  `ALTER TABLE "comments" DROP COLUMN "agent_run_id"`,
] as const;

export class AddCommentAgentRun1783297200000 implements MigrationInterface {
  name = "AddCommentAgentRun1783297200000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addCommentAgentRunSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropCommentAgentRunSql);
  }
}
