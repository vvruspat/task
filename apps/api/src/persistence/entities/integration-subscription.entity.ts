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
  IntegrationSubscription,
  IntegrationSubscriptionStatus,
} from "../../integrations/integration-resources.contracts.js";

@Entity({ name: "integration_subscriptions" })
@Check(
  "chk_integration_subscriptions_status",
  `"status" IN ('active', 'renewing', 'expired', 'error', 'stopped')`,
)
@Index(
  "uq_integration_subscriptions_connection_provider_id",
  ["connectionId", "providerSubscriptionId"],
  { unique: true },
)
@Index("idx_integration_subscriptions_renewal", ["status", "renewAfter"])
@Index("idx_integration_subscriptions_resource", ["externalResourceId"])
export class IntegrationSubscriptionEntity implements IntegrationSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "connection_id", type: "uuid" })
  connectionId = "";

  @Column({ name: "external_resource_id", nullable: true, type: "uuid" })
  externalResourceId: string | null = null;

  @Column({ length: 1024, name: "provider_subscription_id", type: "varchar" })
  providerSubscriptionId = "";

  @Column({ name: "provider_cursor", nullable: true, type: "text" })
  providerCursor: string | null = null;

  @Column({ name: "callback_secret_reference", nullable: true, type: "text" })
  callbackSecretReference: string | null = null;

  @Column({ default: "active", type: "text" })
  status: IntegrationSubscriptionStatus = "active";

  @Column({ name: "expires_at", nullable: true, type: "timestamptz" })
  expiresAt: Date | null = null;

  @Column({ name: "renew_after", nullable: true, type: "timestamptz" })
  renewAfter: Date | null = null;

  @Column({ name: "last_event_at", nullable: true, type: "timestamptz" })
  lastEventAt: Date | null = null;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError: string | null = null;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
