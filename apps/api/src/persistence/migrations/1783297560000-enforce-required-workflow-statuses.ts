import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const enforceRequiredWorkflowStatusesSql = [
  `INSERT INTO "statuses" ("workspace_id", "project_id", "name", "color", "position", "is_done")
   SELECT project."workspace_id", project."id", 'Backlog', '#64748B', 1000::numeric, false
   FROM "projects" project
   WHERE NOT EXISTS (
     SELECT 1
     FROM "statuses" status
     WHERE status."project_id" = project."id"
       AND status."workspace_id" = project."workspace_id"
       AND lower(regexp_replace(trim(status."name"), '\\s+', ' ', 'g')) = 'backlog'
   )`,
  `INSERT INTO "statuses" ("workspace_id", "project_id", "name", "color", "position", "is_done")
   SELECT project."workspace_id", project."id", 'In progress', '#0EA5E9', 3000::numeric, false
   FROM "projects" project
   WHERE NOT EXISTS (
     SELECT 1
     FROM "statuses" status
     WHERE status."project_id" = project."id"
       AND status."workspace_id" = project."workspace_id"
       AND lower(regexp_replace(trim(status."name"), '\\s+', ' ', 'g')) = 'in progress'
   )`,
  `UPDATE "tasks" parent
   SET "status_id" = (
     SELECT in_progress."id"
     FROM "statuses" in_progress
     WHERE in_progress."project_id" = parent."project_id"
       AND in_progress."workspace_id" = parent."workspace_id"
       AND lower(regexp_replace(trim(in_progress."name"), '\\s+', ' ', 'g')) = 'in progress'
     ORDER BY in_progress."position" ASC, in_progress."id" ASC
     LIMIT 1
   )
   WHERE parent."archived_at" IS NULL
     AND EXISTS (
       SELECT 1
       FROM "tasks" child
       JOIN "statuses" child_status ON child_status."id" = child."status_id"
         AND child_status."project_id" = child."project_id"
         AND child_status."workspace_id" = child."workspace_id"
       WHERE child."parent_task_id" = parent."id"
         AND child."project_id" = parent."project_id"
         AND child."workspace_id" = parent."workspace_id"
         AND child."archived_at" IS NULL
         AND lower(regexp_replace(trim(child_status."name"), '\\s+', ' ', 'g')) <> 'backlog'
     )`,
] as const;

export class EnforceRequiredWorkflowStatuses1783297560000 implements MigrationInterface {
  name = "EnforceRequiredWorkflowStatuses1783297560000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, enforceRequiredWorkflowStatusesSql);
  }

  async down(): Promise<void> {
    // Data-only invariants are intentionally retained on rollback.
  }
}
