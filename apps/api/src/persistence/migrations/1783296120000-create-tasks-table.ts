import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createTasksTableSql = [
  `ALTER TABLE "projects" ADD CONSTRAINT "uq_projects_id_workspace_id" UNIQUE ("id", "workspace_id")`,
  `ALTER TABLE "statuses" ADD CONSTRAINT "uq_statuses_id_workspace_id" UNIQUE ("id", "workspace_id")`,
  `CREATE TABLE "tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "parent_task_id" uuid,
    "title" text NOT NULL,
    "description" text,
    "status_id" uuid,
    "assignee_user_id" uuid,
    "created_by_user_id" uuid NOT NULL,
    "position" numeric NOT NULL,
    "due_at" timestamptz,
    "source_skill_id" uuid,
    "source_skill_version_id" uuid,
    "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "archived_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_tasks_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_tasks_project_workspace" FOREIGN KEY ("project_id", "workspace_id") REFERENCES "projects" ("id", "workspace_id") ON DELETE CASCADE,
    CONSTRAINT "fk_tasks_parent_task_workspace" FOREIGN KEY ("parent_task_id", "workspace_id") REFERENCES "tasks" ("id", "workspace_id") ON DELETE CASCADE,
    CONSTRAINT "fk_tasks_status_workspace" FOREIGN KEY ("status_id", "workspace_id") REFERENCES "statuses" ("id", "workspace_id") ON DELETE SET NULL ("status_id"),
    CONSTRAINT "fk_tasks_assignee_user_id" FOREIGN KEY ("assignee_user_id") REFERENCES "users" ("id") ON DELETE SET NULL,
    CONSTRAINT "fk_tasks_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uq_tasks_id_workspace_id" UNIQUE ("id", "workspace_id")
  )`,
  `CREATE INDEX "idx_tasks_workspace_id_project_id" ON "tasks" ("workspace_id", "project_id")`,
  `CREATE INDEX "idx_tasks_workspace_id_parent_task_id" ON "tasks" ("workspace_id", "parent_task_id")`,
  `CREATE INDEX "idx_tasks_workspace_id_status_id" ON "tasks" ("workspace_id", "status_id")`,
  `CREATE INDEX "idx_tasks_workspace_id_assignee_user_id" ON "tasks" ("workspace_id", "assignee_user_id")`,
  `CREATE INDEX "idx_tasks_metadata_gin" ON "tasks" USING GIN ("metadata")`,
] as const;

export const dropTasksTableSql = [
  `DROP INDEX "idx_tasks_metadata_gin"`,
  `DROP INDEX "idx_tasks_workspace_id_assignee_user_id"`,
  `DROP INDEX "idx_tasks_workspace_id_status_id"`,
  `DROP INDEX "idx_tasks_workspace_id_parent_task_id"`,
  `DROP INDEX "idx_tasks_workspace_id_project_id"`,
  `DROP TABLE "tasks"`,
  `ALTER TABLE "statuses" DROP CONSTRAINT "uq_statuses_id_workspace_id"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "uq_projects_id_workspace_id"`,
] as const;

export class CreateTasksTable1783296120000 implements MigrationInterface {
  name = "CreateTasksTable1783296120000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createTasksTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropTasksTableSql);
  }
}
