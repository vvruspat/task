import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addProjectIssueIdentifiersSql = [
  `ALTER TABLE "projects" ADD COLUMN "key" text`,
  `ALTER TABLE "projects" ADD COLUMN "next_task_number" integer NOT NULL DEFAULT 1`,
  `DO $$
  DECLARE
    project_row record;
    normalized_title text;
    base_key text;
    candidate_key text;
    suffix integer;
  BEGIN
    FOR project_row IN
      SELECT "id", "workspace_id", "title"
      FROM "projects"
      ORDER BY "workspace_id", "created_at", "id"
    LOOP
      normalized_title := regexp_replace(
        translate(
          lower(project_row."title"),
          'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
          'abvgdeejzijklmnoprstufhccss_y_eua'
        ),
        '[^a-z0-9]',
        '',
        'g'
      );
      base_key := upper(left(normalized_title, 3));
      IF length(base_key) < 2 THEN
        base_key := 'PRJ';
      END IF;
      candidate_key := base_key;
      suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM "projects"
        WHERE "workspace_id" = project_row."workspace_id"
          AND "key" = candidate_key
      ) LOOP
        candidate_key := left(base_key, 8 - length(suffix::text)) || suffix::text;
        suffix := suffix + 1;
      END LOOP;
      UPDATE "projects" SET "key" = candidate_key WHERE "id" = project_row."id";
    END LOOP;
  END $$`,
  `ALTER TABLE "projects" ALTER COLUMN "key" SET NOT NULL`,
  `ALTER TABLE "projects" ADD CONSTRAINT "chk_projects_key" CHECK ("key" ~ '^[A-Z][A-Z0-9]{1,7}$')`,
  `ALTER TABLE "projects" ADD CONSTRAINT "chk_projects_next_task_number" CHECK ("next_task_number" > 0)`,
  `ALTER TABLE "projects" ADD CONSTRAINT "uq_projects_workspace_id_key" UNIQUE ("workspace_id", "key")`,
  `ALTER TABLE "tasks" ADD COLUMN "number" integer`,
  `WITH numbered_tasks AS (
    SELECT "id", row_number() OVER (
      PARTITION BY "project_id"
      ORDER BY "created_at", "id"
    )::integer AS "issue_number"
    FROM "tasks"
  )
  UPDATE "tasks"
  SET "number" = numbered_tasks."issue_number"
  FROM numbered_tasks
  WHERE "tasks"."id" = numbered_tasks."id"`,
  `UPDATE "projects"
  SET "next_task_number" = COALESCE((
    SELECT max("tasks"."number") + 1
    FROM "tasks"
    WHERE "tasks"."project_id" = "projects"."id"
  ), 1)`,
  `ALTER TABLE "tasks" ALTER COLUMN "number" SET NOT NULL`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "chk_tasks_number" CHECK ("number" > 0)`,
  `ALTER TABLE "tasks" ADD CONSTRAINT "uq_tasks_project_id_number" UNIQUE ("project_id", "number")`,
] as const;

export const dropProjectIssueIdentifiersSql = [
  `ALTER TABLE "tasks" DROP CONSTRAINT "uq_tasks_project_id_number"`,
  `ALTER TABLE "tasks" DROP CONSTRAINT "chk_tasks_number"`,
  `ALTER TABLE "tasks" DROP COLUMN "number"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "uq_projects_workspace_id_key"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "chk_projects_next_task_number"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "chk_projects_key"`,
  `ALTER TABLE "projects" DROP COLUMN "next_task_number"`,
  `ALTER TABLE "projects" DROP COLUMN "key"`,
] as const;

export class AddProjectIssueIdentifiers1783296780000 implements MigrationInterface {
  name = "AddProjectIssueIdentifiers1783296780000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addProjectIssueIdentifiersSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropProjectIssueIdentifiersSql);
  }
}
