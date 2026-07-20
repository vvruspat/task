import { randomUUID } from "node:crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { TaskRecord } from "../types/core-persistence.types.js";

@Entity({ name: "tasks" })
@Index("idx_tasks_workspace_id_project_id", ["workspaceId", "projectId"])
@Index("idx_tasks_workspace_id_parent_task_id", ["workspaceId", "parentTaskId"])
@Index("idx_tasks_workspace_id_status_id", ["workspaceId", "statusId"])
@Index("idx_tasks_workspace_id_assignee_user_id", ["workspaceId", "assigneeUserId"])
@Index("idx_tasks_metadata_gin", ["metadata"])
@Index("uq_tasks_project_id_number", ["projectId", "number"], { unique: true })
export class TaskEntity implements TaskRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "project_id", type: "uuid" })
  projectId = "";

  @Column({ type: "integer" })
  number = 0;

  @Column({ name: "parent_task_id", nullable: true, type: "uuid" })
  parentTaskId: string | null = null;

  @Column({ type: "text" })
  title = "";

  @Column({ nullable: true, type: "text" })
  description: string | null = null;

  @Column({ name: "status_id", type: "uuid" })
  statusId: string | null = null;

  @Column({ name: "assignee_user_id", nullable: true, type: "uuid" })
  assigneeUserId: string | null = null;

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @Column({ type: "numeric" })
  position = "0";

  @Column({ name: "due_at", nullable: true, type: "timestamptz" })
  dueAt: Date | null = null;

  @Column({ name: "source_skill_id", nullable: true, type: "uuid" })
  sourceSkillId: string | null = null;

  @Column({ name: "source_skill_version_id", nullable: true, type: "uuid" })
  sourceSkillVersionId: string | null = null;

  @Column({ default: () => "'{}'::jsonb", type: "jsonb" })
  metadata: Record<string, unknown> = {};

  @Column({ name: "archived_at", nullable: true, type: "timestamptz" })
  archivedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date();

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date();
}
