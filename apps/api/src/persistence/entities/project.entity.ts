import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ProjectRecord } from "../types/core-persistence.types.js";

@Entity({ name: "projects" })
@Index("idx_projects_workspace_id", ["workspaceId"])
@Index("idx_projects_created_by_user_id", ["createdByUserId"])
@Index("idx_projects_workspace_id_archived_at", ["workspaceId", "archivedAt"])
@Index("uq_projects_workspace_id_key", ["workspaceId", "key"], { unique: true })
@Index("uq_projects_workspace_id_slug", ["workspaceId", "slug"], {
  unique: true,
})
export class ProjectEntity implements ProjectRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ type: "text" })
  key = "";

  @Column({ type: "text" })
  slug = "";

  @Column({ default: 1, name: "next_task_number", type: "integer" })
  nextTaskNumber = 1;

  @Column({ type: "text" })
  title = "";

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @Column({ nullable: true, type: "text" })
  status: string | null = null;

  @Column({ nullable: true, type: "numeric" })
  position: string | null = null;

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @Column({ name: "archived_at", nullable: true, type: "timestamptz" })
  archivedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
