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
  WorkspaceIntegration,
  WorkspaceIntegrationStatus,
} from "../../integrations/integrations.contracts.js";

@Entity({ name: "workspace_integrations" })
@Check(
  "chk_workspace_integrations_status",
  `"status" IN ('authorizing', 'connected', 'disconnected', 'error')`,
)
@Index("uq_workspace_integrations_workspace_plugin", ["workspaceId", "pluginKey"], {
  unique: true,
})
@Index("idx_workspace_integrations_workspace_status", ["workspaceId", "status"])
@Index("idx_workspace_integrations_installed_by_user_id", ["installedByUserId"])
@Index("idx_workspace_integrations_connected_by_user_id", ["connectedByUserId"])
export class WorkspaceIntegrationEntity implements WorkspaceIntegration {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "plugin_key", type: "text" })
  pluginKey = "";

  @Column({ name: "plugin_version", type: "text" })
  pluginVersion = "";

  @Column({ default: "disconnected", type: "text" })
  status: WorkspaceIntegrationStatus = "disconnected";

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  config: Record<string, unknown> = {};

  @Column({ name: "installed_by_user_id", type: "uuid" })
  installedByUserId = "";

  @Column({ name: "connected_by_user_id", nullable: true, type: "uuid" })
  connectedByUserId: string | null = null;

  @Column({ name: "connected_at", nullable: true, type: "timestamptz" })
  connectedAt: Date | null = null;

  @Column({ name: "disconnected_at", nullable: true, type: "timestamptz" })
  disconnectedAt: Date | null = null;

  @Column({ name: "last_error", nullable: true, type: "text" })
  lastError: string | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
