import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { StatusRecord } from "../types/core-persistence.types.js";

@Entity({ name: "statuses" })
@Unique("uq_statuses_workspace_id_name", ["workspaceId", "name"])
@Index("idx_statuses_workspace_id", ["workspaceId"])
export class StatusEntity implements StatusRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ type: "text" })
  name = "";

  @Column({ type: "text" })
  color = "";

  @Column({ type: "numeric" })
  position = "0";

  @Column({ default: false, name: "is_done", type: "boolean" })
  isDone = false;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
