import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";
import type { TaskSkillVersionRecord } from "../types/core-persistence.types.js";

@Entity({ name: "task_skill_versions" })
@Unique("uq_task_skill_versions_task_skill_id_version", ["taskSkillId", "version"])
@Index("idx_task_skill_versions_workspace_id", ["workspaceId"])
@Index("idx_task_skill_versions_task_skill_id", ["taskSkillId"])
@Index("idx_task_skill_versions_created_by_user_id", ["createdByUserId"])
export class TaskSkillVersionEntity implements TaskSkillVersionRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "task_skill_id", type: "uuid" })
  taskSkillId = "";

  @Column({ type: "int" })
  version = 1;

  @Column({ type: "jsonb" })
  definition: Record<string, unknown> = {};

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
