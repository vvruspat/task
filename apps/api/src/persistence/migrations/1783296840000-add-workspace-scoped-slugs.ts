import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addWorkspaceScopedSlugsSql = [
  `ALTER TABLE "projects" ADD COLUMN "slug" text`,
  `ALTER TABLE "saved_views" ADD COLUMN "slug" text`,
  `DO $$
  DECLARE
    item record;
    base_slug text;
    candidate_slug text;
    suffix integer;
  BEGIN
    FOR item IN
      SELECT "id", "workspace_id", "title"
      FROM "projects"
      ORDER BY "workspace_id", "created_at", "id"
    LOOP
      base_slug := trim(both '-' from regexp_replace(
        translate(
          lower(item."title"),
          'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
          'abvgdeejzijklmnoprstufhccss_y_eua'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      ));
      IF base_slug = '' THEN base_slug := 'project'; END IF;
      base_slug := left(base_slug, 80);
      candidate_slug := base_slug;
      suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM "projects"
        WHERE "workspace_id" = item."workspace_id"
          AND "slug" = candidate_slug
      ) LOOP
        candidate_slug := trim(trailing '-' from left(base_slug, 79 - length(suffix::text))) || '-' || suffix::text;
        suffix := suffix + 1;
      END LOOP;
      UPDATE "projects" SET "slug" = candidate_slug WHERE "id" = item."id";
    END LOOP;

    FOR item IN
      SELECT "id", "workspace_id", "name"
      FROM "saved_views"
      ORDER BY "workspace_id", "created_at", "id"
    LOOP
      base_slug := trim(both '-' from regexp_replace(
        translate(
          lower(item."name"),
          'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
          'abvgdeejzijklmnoprstufhccss_y_eua'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      ));
      IF base_slug = '' THEN base_slug := 'view'; END IF;
      base_slug := left(base_slug, 80);
      candidate_slug := base_slug;
      suffix := 2;
      WHILE EXISTS (
        SELECT 1 FROM "saved_views"
        WHERE "workspace_id" = item."workspace_id"
          AND "slug" = candidate_slug
      ) LOOP
        candidate_slug := trim(trailing '-' from left(base_slug, 79 - length(suffix::text))) || '-' || suffix::text;
        suffix := suffix + 1;
      END LOOP;
      UPDATE "saved_views" SET "slug" = candidate_slug WHERE "id" = item."id";
    END LOOP;
  END $$`,
  `ALTER TABLE "projects" ALTER COLUMN "slug" SET NOT NULL`,
  `ALTER TABLE "saved_views" ALTER COLUMN "slug" SET NOT NULL`,
  `ALTER TABLE "projects" ADD CONSTRAINT "chk_projects_slug" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
  `ALTER TABLE "saved_views" ADD CONSTRAINT "chk_saved_views_slug" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
  `ALTER TABLE "projects" ADD CONSTRAINT "uq_projects_workspace_id_slug" UNIQUE ("workspace_id", "slug")`,
  `ALTER TABLE "saved_views" ADD CONSTRAINT "uq_saved_views_workspace_id_slug" UNIQUE ("workspace_id", "slug")`,
] as const;

export const dropWorkspaceScopedSlugsSql = [
  `ALTER TABLE "saved_views" DROP CONSTRAINT "uq_saved_views_workspace_id_slug"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "uq_projects_workspace_id_slug"`,
  `ALTER TABLE "saved_views" DROP CONSTRAINT "chk_saved_views_slug"`,
  `ALTER TABLE "projects" DROP CONSTRAINT "chk_projects_slug"`,
  `ALTER TABLE "saved_views" DROP COLUMN "slug"`,
  `ALTER TABLE "projects" DROP COLUMN "slug"`,
] as const;

export class AddWorkspaceScopedSlugs1783296840000 implements MigrationInterface {
  name = "AddWorkspaceScopedSlugs1783296840000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addWorkspaceScopedSlugsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropWorkspaceScopedSlugsSql);
  }
}
