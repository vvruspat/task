import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import type { TaskSkillRecord } from "../types/core-persistence.types.js";

@Entity({ name: "task_skills" })
@Unique("uq_task_skills_workspace_id_name", ["workspaceId", "name"])
@Index("idx_task_skills_workspace_id", ["workspaceId"])
@Index("idx_task_skills_created_by_user_id", ["createdByUserId"])
@Index("idx_task_skills_workspace_id_archived_at", ["workspaceId", "archivedAt"])
export class TaskSkillEntity implements TaskSkillRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ type: "text" })
  name = "";

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @Column({ array: true, default: () => "'{}'::text[]", type: "text" })
  aliases: string[] = [];

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @Column({ name: "archived_at", nullable: true, type: "timestamptz" })
  archivedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
