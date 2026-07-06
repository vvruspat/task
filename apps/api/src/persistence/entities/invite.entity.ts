import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { InviteRecord, WorkspaceMemberRole } from "../types/core-persistence.types.js";

@Entity({ name: "invites" })
@Check("chk_invites_role", `"role" IN ('owner', 'admin', 'member', 'guest')`)
@Index("idx_invites_workspace_id_expires_at", ["workspaceId", "expiresAt"])
@Index("idx_invites_workspace_id_invited_user_id", ["workspaceId", "invitedUserId"])
@Index("idx_invites_created_by_user_id", ["createdByUserId"])
export class InviteEntity implements InviteRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "invited_user_id", nullable: true, type: "uuid" })
  invitedUserId: string | null = null;

  @Column({ name: "token_hash", type: "text", unique: true })
  tokenHash = "";

  @Column({ type: "text" })
  role: WorkspaceMemberRole = "member";

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt = new Date(0);

  @Column({ name: "used_at", nullable: true, type: "timestamptz" })
  usedAt: Date | null = null;

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
