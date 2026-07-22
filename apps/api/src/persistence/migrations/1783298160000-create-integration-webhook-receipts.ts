import type { MigrationInterface, QueryRunner } from "typeorm";

export const createIntegrationWebhookReceiptsQueries = [
  `CREATE TABLE "integration_webhook_receipts" ("id" uuid NOT NULL, "plugin_key" varchar(128) NOT NULL, "workspace_integration_id" uuid NOT NULL, "connection_id" uuid NOT NULL, "subscription_id" uuid NOT NULL, "provider_event_id" varchar(1024) NOT NULL, "event_type" varchar(128) NOT NULL, "status" text NOT NULL DEFAULT 'received', "attempt_count" integer NOT NULL DEFAULT 0, "headers" jsonb NOT NULL DEFAULT '{}'::jsonb, "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "received_at" timestamptz NOT NULL DEFAULT now(), "processed_at" timestamptz, "last_error" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_webhook_receipts" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_webhook_receipts_status" CHECK ("status" IN ('received', 'processing', 'processed', 'ignored', 'failed')), CONSTRAINT "fk_integration_webhook_receipts_workspace_integration" FOREIGN KEY ("workspace_integration_id") REFERENCES "workspace_integrations" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_webhook_receipts_connection" FOREIGN KEY ("connection_id") REFERENCES "integration_connections" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_webhook_receipts_subscription" FOREIGN KEY ("subscription_id") REFERENCES "integration_subscriptions" ("id") ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX "uq_integration_webhook_receipts_plugin_event" ON "integration_webhook_receipts" ("plugin_key", "provider_event_id")`,
  `CREATE INDEX "idx_integration_webhook_receipts_status_received" ON "integration_webhook_receipts" ("status", "received_at")`,
  `CREATE INDEX "idx_integration_webhook_receipts_subscription" ON "integration_webhook_receipts" ("subscription_id", "received_at")`,
] as const;

export const dropIntegrationWebhookReceiptsQueries = [
  `DROP INDEX "idx_integration_webhook_receipts_subscription"`,
  `DROP INDEX "idx_integration_webhook_receipts_status_received"`,
  `DROP INDEX "uq_integration_webhook_receipts_plugin_event"`,
  `DROP TABLE "integration_webhook_receipts"`,
] as const;

export class CreateIntegrationWebhookReceipts1783298160000 implements MigrationInterface {
  name = "CreateIntegrationWebhookReceipts1783298160000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of createIntegrationWebhookReceiptsQueries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of dropIntegrationWebhookReceiptsQueries) await queryRunner.query(query);
  }
}
