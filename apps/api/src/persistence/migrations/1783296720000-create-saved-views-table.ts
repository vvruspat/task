import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createSavedViewsTableSql = [
  `CREATE TABLE "saved_views" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid,
    "name" text NOT NULL,
    "description" text,
    "layout" text NOT NULL,
    "settings" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_saved_views_layout" CHECK ("layout" IN ('list', 'board')),
    CONSTRAINT "fk_saved_views_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_saved_views_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_saved_views_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE
  )`,
  `CREATE INDEX "idx_saved_views_workspace_id_user_id" ON "saved_views" ("workspace_id", "user_id")`,
  `CREATE INDEX "idx_saved_views_project_id" ON "saved_views" ("project_id")`,
] as const;

export const dropSavedViewsTableSql = [
  `DROP INDEX "idx_saved_views_project_id"`,
  `DROP INDEX "idx_saved_views_workspace_id_user_id"`,
  `DROP TABLE "saved_views"`,
] as const;

export class CreateSavedViewsTable1783296720000 implements MigrationInterface {
  name = "CreateSavedViewsTable1783296720000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createSavedViewsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropSavedViewsTableSql);
  }
}
