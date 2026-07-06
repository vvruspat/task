import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type {
  WorkspaceMemberRecord,
  WorkspaceMemberRole,
} from "../types/core-persistence.types.js";

@Entity({ name: "workspace_members" })
@Check("chk_workspace_members_role", `"role" IN ('owner', 'admin', 'member', 'guest')`)
@Unique("uq_workspace_members_workspace_id_user_id", ["workspaceId", "userId"])
@Index("idx_workspace_members_workspace_id", ["workspaceId"])
@Index("idx_workspace_members_user_id", ["userId"])
export class WorkspaceMemberEntity implements WorkspaceMemberRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ type: "text" })
  role: WorkspaceMemberRole = "member";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
