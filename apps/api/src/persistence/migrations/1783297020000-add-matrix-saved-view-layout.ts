import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addMatrixSavedViewLayoutSql = [
  `ALTER TABLE "saved_views" DROP CONSTRAINT "chk_saved_views_layout"`,
  `ALTER TABLE "saved_views" ADD CONSTRAINT "chk_saved_views_layout" CHECK ("layout" IN ('list', 'board', 'matrix'))`,
] as const;

export const dropMatrixSavedViewLayoutSql = [
  `UPDATE "saved_views" SET "layout" = 'list' WHERE "layout" = 'matrix'`,
  `ALTER TABLE "saved_views" DROP CONSTRAINT "chk_saved_views_layout"`,
  `ALTER TABLE "saved_views" ADD CONSTRAINT "chk_saved_views_layout" CHECK ("layout" IN ('list', 'board'))`,
] as const;

export class AddMatrixSavedViewLayout1783297020000 implements MigrationInterface {
  name = "AddMatrixSavedViewLayout1783297020000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addMatrixSavedViewLayoutSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropMatrixSavedViewLayoutSql);
  }
}
