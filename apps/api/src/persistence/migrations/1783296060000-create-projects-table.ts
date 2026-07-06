import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createProjectsTableSql = [
  `CREATE TABLE "projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "status" text,
    "position" numeric,
    "created_by_user_id" uuid NOT NULL,
    "archived_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_projects_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_projects_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
  )`,
  `CREATE INDEX "idx_projects_workspace_id" ON "projects" ("workspace_id")`,
  `CREATE INDEX "idx_projects_created_by_user_id" ON "projects" ("created_by_user_id")`,
  `CREATE INDEX "idx_projects_workspace_id_archived_at" ON "projects" ("workspace_id", "archived_at")`,
] as const;

export const dropProjectsTableSql = [
  `DROP INDEX "idx_projects_workspace_id_archived_at"`,
  `DROP INDEX "idx_projects_created_by_user_id"`,
  `DROP INDEX "idx_projects_workspace_id"`,
  `DROP TABLE "projects"`,
] as const;

export class CreateProjectsTable1783296060000 implements MigrationInterface {
  name = "CreateProjectsTable1783296060000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createProjectsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropProjectsTableSql);
  }
}
