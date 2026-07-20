import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addWorkspaceDescriptionSql = [
  `ALTER TABLE "workspaces" ADD COLUMN "description" text`,
] as const;

export const dropWorkspaceDescriptionSql = [
  `ALTER TABLE "workspaces" DROP COLUMN "description"`,
] as const;

export class AddWorkspaceDescription1783296960000 implements MigrationInterface {
  name = "AddWorkspaceDescription1783296960000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addWorkspaceDescriptionSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropWorkspaceDescriptionSql);
  }
}
