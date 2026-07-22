import { randomUUID } from "node:crypto";
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type {
  IntegrationWebhookReceipt,
  IntegrationWebhookReceiptStatus,
} from "../../integrations/integration-webhook.contracts.js";

@Entity({ name: "integration_webhook_receipts" })
@Check(
  "chk_integration_webhook_receipts_status",
  `"status" IN ('received', 'processing', 'processed', 'ignored', 'failed')`,
)
@Index("uq_integration_webhook_receipts_plugin_event", ["pluginKey", "providerEventId"], {
  unique: true,
})
@Index("idx_integration_webhook_receipts_status_received", ["status", "receivedAt"])
@Index("idx_integration_webhook_receipts_subscription", ["subscriptionId", "receivedAt"])
@Index("idx_integration_webhook_receipts_installation_status", ["workspaceIntegrationId", "status"])
export class IntegrationWebhookReceiptEntity implements IntegrationWebhookReceipt {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ length: 128, name: "plugin_key", type: "varchar" })
  pluginKey = "";

  @Column({ name: "workspace_integration_id", type: "uuid" })
  workspaceIntegrationId = "";

  @Column({ name: "connection_id", type: "uuid" })
  connectionId = "";

  @Column({ name: "subscription_id", type: "uuid" })
  subscriptionId = "";

  @Column({ length: 1024, name: "provider_event_id", type: "varchar" })
  providerEventId = "";

  @Column({ length: 128, name: "event_type", type: "varchar" })
  eventType = "";

  @Column({ default: "received", type: "text" })
  status: IntegrationWebhookReceiptStatus = "received";

  @Column({ default: 0, name: "attempt_count", type: "integer" })
  attemptCount = 0;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  headers: Record<string, unknown> = {};

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  payload: Record<string, unknown> = {};

  @Column({ default: () => "now()", name: "received_at", type: "timestamptz" })
  receivedAt = new Date();

  @Column({ name: "processed_at", nullable: true, type: "timestamptz" })
  processedAt: Date | null = null;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
