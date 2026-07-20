import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const requireTaskStatusesSql = [
  `UPDATE "tasks" task
   SET "status_id" = (
     SELECT status."id"
     FROM "statuses" status
     WHERE status."workspace_id" = task."workspace_id"
       AND status."project_id" = task."project_id"
     ORDER BY
       CASE
         WHEN lower(trim(status."name")) IN ('backlog', 'беклог', 'бэклог') THEN 0
         WHEN status."is_done" = false THEN 1
         ELSE 2
       END,
       status."position" ASC,
       status."id" ASC
     LIMIT 1
   )
   WHERE task."status_id" IS NULL`,
  `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_status_project_workspace"`,
  `ALTER TABLE "tasks" ALTER COLUMN "status_id" SET NOT NULL`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_status_project_workspace" FOREIGN KEY ("status_id", "project_id", "workspace_id") REFERENCES "statuses" ("id", "project_id", "workspace_id") ON DELETE RESTRICT`,
] as const;

export const allowMissingTaskStatusesSql = [
  `ALTER TABLE "tasks" DROP CONSTRAINT "fk_tasks_status_project_workspace"`,
  `ALTER TABLE "tasks" ALTER COLUMN "status_id" DROP NOT NULL`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_status_project_workspace" FOREIGN KEY ("status_id", "project_id", "workspace_id") REFERENCES "statuses" ("id", "project_id", "workspace_id") ON DELETE SET NULL ("status_id")`,
] as const;

export class RequireTaskStatuses1783297500000 implements MigrationInterface {
  name = "RequireTaskStatuses1783297500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, requireTaskStatusesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, allowMissingTaskStatusesSql);
  }
}
