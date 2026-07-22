import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addSavedViewVisibilitySql = [
  `ALTER TABLE "saved_views" ADD COLUMN "visibility" text NOT NULL DEFAULT 'private'`,
  `ALTER TABLE "saved_views" ADD CONSTRAINT "chk_saved_views_visibility" CHECK ("visibility" IN ('private', 'workspace'))`,
  `CREATE INDEX "idx_saved_views_workspace_id_visibility" ON "saved_views" ("workspace_id", "visibility")`,
] as const;

export const removeSavedViewVisibilitySql = [
  `DROP INDEX "idx_saved_views_workspace_id_visibility"`,
  `ALTER TABLE "saved_views" DROP CONSTRAINT "chk_saved_views_visibility"`,
  `ALTER TABLE "saved_views" DROP COLUMN "visibility"`,
] as const;

export class AddSavedViewVisibility1783297860000 implements MigrationInterface {
  name = "AddSavedViewVisibility1783297860000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addSavedViewVisibilitySql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, removeSavedViewVisibilitySql);
  }
}
