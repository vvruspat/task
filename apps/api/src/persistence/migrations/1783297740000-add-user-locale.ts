import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addUserLocaleSql = [
  `ALTER TABLE "users" ADD COLUMN "locale" text`,
  `ALTER TABLE "users" ADD CONSTRAINT "chk_users_locale" CHECK ("locale" IS NULL OR "locale" IN ('en', 'ru'))`,
] as const;

export const dropUserLocaleSql = [
  `ALTER TABLE "users" DROP CONSTRAINT "chk_users_locale"`,
  `ALTER TABLE "users" DROP COLUMN "locale"`,
] as const;

export class AddUserLocale1783297740000 implements MigrationInterface {
  name = "AddUserLocale1783297740000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addUserLocaleSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropUserLocaleSql);
  }
}
