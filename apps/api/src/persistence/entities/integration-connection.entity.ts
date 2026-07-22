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
  IntegrationConnection,
  IntegrationConnectionStatus,
} from "../../integrations/integration-connections.contracts.js";

@Entity({ name: "integration_connections" })
@Check("chk_integration_connections_status", `"status" IN ('connected', 'disconnected', 'error')`)
@Index("uq_integration_connections_workspace_integration", ["workspaceIntegrationId"], {
  unique: true,
})
@Index("idx_integration_connections_provider_account", ["providerAccountId"])
export class IntegrationConnectionEntity implements IntegrationConnection {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_integration_id", type: "uuid" })
  workspaceIntegrationId = "";

  @Column({ name: "provider_account_id", type: "text" })
  providerAccountId = "";

  @Column({ name: "display_name", nullable: true, type: "text" })
  displayName: string | null = null;

  @Column({ name: "secret_reference", type: "text" })
  secretReference = "";

  @Column({ array: true, default: () => "'{}'::text[]", type: "text" })
  scopes: string[] = [];

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};

  @Column({ default: "connected", type: "text" })
  status: IntegrationConnectionStatus = "connected";

  @Column({ name: "connected_by_user_id", type: "uuid" })
  connectedByUserId = "";

  @Column({ name: "connected_at", type: "timestamptz" })
  connectedAt = new Date();

  @Column({ name: "disconnected_at", nullable: true, type: "timestamptz" })
  disconnectedAt: Date | null = null;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
