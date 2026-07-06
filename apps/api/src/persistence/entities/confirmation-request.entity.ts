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
  ConfirmationRequestRecord,
  ConfirmationRequestStatus,
} from "../types/core-persistence.types.js";

@Entity({ name: "confirmation_requests" })
@Check(
  "chk_confirmation_requests_status",
  `"status" IN ('pending', 'confirmed', 'cancelled', 'expired')`,
)
@Index("idx_confirmation_requests_workspace_id_user_id_status", ["workspaceId", "userId", "status"])
@Index("idx_confirmation_requests_agent_run_id", ["agentRunId"])
@Index("idx_confirmation_requests_workspace_id_expires_at", ["workspaceId", "expiresAt"])
export class ConfirmationRequestEntity implements ConfirmationRequestRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "agent_run_id", type: "uuid" })
  agentRunId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ type: "text" })
  kind = "";

  @Column({ type: "jsonb" })
  preview: Record<string, unknown> = {};

  @Column({ type: "text" })
  status: ConfirmationRequestStatus = "pending";

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt = new Date(0);

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
