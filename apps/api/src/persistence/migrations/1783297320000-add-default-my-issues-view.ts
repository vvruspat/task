import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addDefaultMyIssuesViewSql = [
  `ALTER TABLE "saved_views" ADD COLUMN "system_key" text`,
  `CREATE UNIQUE INDEX "uq_saved_views_workspace_user_system_key"
    ON "saved_views" ("workspace_id", "user_id", "system_key")
    WHERE "system_key" IS NOT NULL`,
] as const;

export const removeDefaultMyIssuesViewSql = [
  `DROP INDEX "uq_saved_views_workspace_user_system_key"`,
  `ALTER TABLE "saved_views" DROP COLUMN "system_key"`,
] as const;

export class AddDefaultMyIssuesView1783297320000 implements MigrationInterface {
  name = "AddDefaultMyIssuesView1783297320000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addDefaultMyIssuesViewSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, removeDefaultMyIssuesViewSql);
  }
}
