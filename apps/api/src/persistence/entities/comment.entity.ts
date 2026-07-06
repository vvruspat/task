import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { CommentRecord } from "../types/core-persistence.types.js";

@Entity({ name: "comments" })
@Index("idx_comments_workspace_id_task_id", ["workspaceId", "taskId"])
@Index("idx_comments_workspace_id_author_user_id", ["workspaceId", "authorUserId"])
export class CommentEntity implements CommentRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "task_id", type: "uuid" })
  taskId = "";

  @Column({ name: "author_user_id", type: "uuid" })
  authorUserId = "";

  @Column({ type: "text" })
  body = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
