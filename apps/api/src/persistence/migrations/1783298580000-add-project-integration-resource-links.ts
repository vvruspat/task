import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addProjectIntegrationResourceLinksSql = [
  `ALTER TABLE "integration_resource_links" DROP CONSTRAINT "chk_integration_resource_links_target_type"`,
  `ALTER TABLE "integration_resource_links" ADD CONSTRAINT "chk_integration_resource_links_target_type" CHECK ("target_type" IN ('workspace', 'project', 'task', 'comment', 'attachment'))`,
  `CREATE UNIQUE INDEX "uq_integration_resource_links_managed_container" ON "integration_resource_links" ("external_resource_id") WHERE "relation" = 'managed_container' AND "target_type" IN ('project', 'task')`,
] as const;

export const removeProjectIntegrationResourceLinksSql = [
  `DROP INDEX "uq_integration_resource_links_managed_container"`,
  `DELETE FROM "integration_resource_links" WHERE "target_type" = 'project'`,
  `ALTER TABLE "integration_resource_links" DROP CONSTRAINT "chk_integration_resource_links_target_type"`,
  `ALTER TABLE "integration_resource_links" ADD CONSTRAINT "chk_integration_resource_links_target_type" CHECK ("target_type" IN ('workspace', 'task', 'comment', 'attachment'))`,
] as const;

export class AddProjectIntegrationResourceLinks1783298580000 implements MigrationInterface {
  name = "AddProjectIntegrationResourceLinks1783298580000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addProjectIntegrationResourceLinksSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, removeProjectIntegrationResourceLinksSql);
  }
}
