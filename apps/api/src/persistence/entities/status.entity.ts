import { randomUUID } from "node:crypto";
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
@Unique("uq_statuses_project_id_name", ["projectId", "name"])
@Index("idx_statuses_workspace_id_project_id", ["workspaceId", "projectId"])
export class StatusEntity implements StatusRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "project_id", type: "uuid" })
  projectId = "";

  @Column({ type: "text" })
  name = "";

  @Column({ type: "text" })
  color = "";

  @Column({ type: "numeric" })
  position = "0";

  @Column({ default: false, name: "is_done", type: "boolean" })
  isDone = false;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
