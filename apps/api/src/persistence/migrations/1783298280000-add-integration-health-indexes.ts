import type { MigrationInterface, QueryRunner } from "typeorm";

export const addIntegrationHealthIndexesQueries = [
  `CREATE INDEX "idx_integration_subscriptions_connection_status" ON "integration_subscriptions" ("connection_id", "status")`,
  `CREATE INDEX "idx_integration_event_deliveries_installation_status" ON "integration_event_deliveries" ("workspace_integration_id", "status")`,
  `CREATE INDEX "idx_integration_webhook_receipts_installation_status" ON "integration_webhook_receipts" ("workspace_integration_id", "status")`,
] as const;

export const dropIntegrationHealthIndexesQueries = [
  `DROP INDEX "idx_integration_webhook_receipts_installation_status"`,
  `DROP INDEX "idx_integration_event_deliveries_installation_status"`,
  `DROP INDEX "idx_integration_subscriptions_connection_status"`,
] as const;

export class AddIntegrationHealthIndexes1783298280000 implements MigrationInterface {
  name = "AddIntegrationHealthIndexes1783298280000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of addIntegrationHealthIndexesQueries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of dropIntegrationHealthIndexesQueries) await queryRunner.query(query);
  }
}
