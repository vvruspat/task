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
  IntegrationDeliveryStatus,
  IntegrationEventDelivery,
} from "../../integrations/integration-outbox.contracts.js";

@Entity({ name: "integration_event_deliveries" })
@Check(
  "chk_integration_event_deliveries_status",
  `"status" IN ('pending', 'processing', 'succeeded', 'dead')`,
)
@Index(
  "uq_integration_event_deliveries_event_installation",
  ["outboxEventId", "workspaceIntegrationId"],
  { unique: true },
)
@Index("idx_integration_event_deliveries_claim", ["status", "availableAt", "lockedAt"])
@Index("idx_integration_event_deliveries_workspace_integration", ["workspaceIntegrationId"])
export class IntegrationEventDeliveryEntity implements IntegrationEventDelivery {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "outbox_event_id", type: "uuid" })
  outboxEventId = "";

  @Column({ name: "workspace_integration_id", type: "uuid" })
  workspaceIntegrationId = "";

  @Column({ name: "plugin_key", type: "text" })
  pluginKey = "";

  @Column({ name: "plugin_version", type: "text" })
  pluginVersion = "";

  @Column({ default: "pending", type: "text" })
  status: IntegrationDeliveryStatus = "pending";

  @Column({ default: 0, name: "attempt_count", type: "integer" })
  attemptCount = 0;

  @Column({ default: () => "now()", name: "available_at", type: "timestamptz" })
  availableAt = new Date();

  @Column({ name: "locked_at", nullable: true, type: "timestamptz" })
  lockedAt: Date | null = null;

  @Column({ name: "lock_token", nullable: true, type: "uuid" })
  lockToken: string | null = null;

  @Column({ name: "processed_at", nullable: true, type: "timestamptz" })
  processedAt: Date | null = null;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
