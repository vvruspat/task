import type { MigrationInterface, QueryRunner } from "typeorm";

export const allowMultipleIntegrationConnectionsQueries = [
  `ALTER TABLE "integration_connections" DROP CONSTRAINT "uq_integration_connections_workspace_integration"`,
  `CREATE UNIQUE INDEX "uq_integration_connections_installation_provider_account" ON "integration_connections" ("workspace_integration_id", "provider_account_id")`,
] as const;

export const restoreSingleIntegrationConnectionQueries = [
  `DROP INDEX "uq_integration_connections_installation_provider_account"`,
  `ALTER TABLE "integration_connections" ADD CONSTRAINT "uq_integration_connections_workspace_integration" UNIQUE ("workspace_integration_id")`,
] as const;

export class AllowMultipleIntegrationConnections1783298340000 implements MigrationInterface {
  name = "AllowMultipleIntegrationConnections1783298340000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of allowMultipleIntegrationConnectionsQueries) {
      await queryRunner.query(query);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of restoreSingleIntegrationConnectionQueries) {
      await queryRunner.query(query);
    }
  }
}
