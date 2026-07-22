import { randomUUID } from "node:crypto";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { IntegrationOAuthState } from "../../integrations/integration-connections.contracts.js";

@Entity({ name: "integration_oauth_states" })
@Index("uq_integration_oauth_states_state_hash", ["stateHash"], { unique: true })
@Index("idx_integration_oauth_states_installation", ["workspaceIntegrationId", "createdAt"])
@Index("idx_integration_oauth_states_expiry", ["expiresAt", "consumedAt"])
export class IntegrationOAuthStateEntity implements IntegrationOAuthState {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ length: 64, name: "state_hash", type: "varchar" })
  stateHash = "";

  @Column({ name: "workspace_integration_id", type: "uuid" })
  workspaceIntegrationId = "";

  @Column({ name: "plugin_key", type: "text" })
  pluginKey = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt = new Date();

  @Column({ name: "consumed_at", nullable: true, type: "timestamptz" })
  consumedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();
}
