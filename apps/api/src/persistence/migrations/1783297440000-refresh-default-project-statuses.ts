import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const refreshDefaultProjectStatusesSql = [
  `UPDATE "statuses"
   SET "color" = CASE lower(trim("name"))
     WHEN 'backlog' THEN '#64748B'
     WHEN 'todo' THEN '#6366F1'
     WHEN 'in progress' THEN '#0EA5E9'
     WHEN 'in review' THEN '#8B5CF6'
     WHEN 'test' THEN '#F59E0B'
     WHEN 'done' THEN '#22A06B'
     WHEN 'won’t do' THEN '#B76E79'
     WHEN 'canceled' THEN '#E5484D'
     ELSE "color"
   END,
   "is_done" = CASE
     WHEN lower(trim("name")) IN ('won’t do', 'canceled') THEN true
     ELSE "is_done"
   END
   WHERE lower(trim("name")) IN (
     'backlog', 'todo', 'in progress', 'in review', 'test', 'done', 'won’t do', 'canceled'
   )`,
  `INSERT INTO "statuses" ("workspace_id", "project_id", "name", "color", "position", "is_done")
   SELECT project."workspace_id", project."id", default_status."name", default_status."color", default_status."position", true
   FROM "projects" project
   CROSS JOIN (
     VALUES
       ('Won’t do', '#B76E79', 7000::numeric),
       ('Canceled', '#E5484D', 8000::numeric)
   ) AS default_status("name", "color", "position")
   WHERE NOT EXISTS (
     SELECT 1
     FROM "statuses" existing_status
     WHERE existing_status."project_id" = project."id"
       AND lower(trim(existing_status."name")) = lower(default_status."name")
   )`,
] as const;

export const restoreDefaultProjectStatusesSql = [
  `DELETE FROM "statuses" WHERE "name" IN ('Won’t do', 'Canceled')`,
  `UPDATE "statuses"
   SET "color" = CASE lower(trim("name"))
     WHEN 'backlog' THEN '#8B8D98'
     WHEN 'todo' THEN '#5B5BD6'
     WHEN 'in progress' THEN '#3E63DD'
     WHEN 'in review' THEN '#8E4EC6'
     WHEN 'test' THEN '#D6409F'
     WHEN 'done' THEN '#30A46C'
     ELSE "color"
   END
   WHERE lower(trim("name")) IN ('backlog', 'todo', 'in progress', 'in review', 'test', 'done')`,
] as const;

export class RefreshDefaultProjectStatuses1783297440000 implements MigrationInterface {
  name = "RefreshDefaultProjectStatuses1783297440000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, refreshDefaultProjectStatusesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, restoreDefaultProjectStatusesSql);
  }
}
