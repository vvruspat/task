import { randomUUID } from "node:crypto";
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
@Index("idx_comments_parent_comment_id", ["parentCommentId"])
@Index("idx_comments_agent_run_id", ["agentRunId"])
export class CommentEntity implements CommentRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "task_id", type: "uuid" })
  taskId = "";

  @Column({ name: "author_user_id", type: "uuid" })
  authorUserId = "";

  @Column({ name: "agent_run_id", nullable: true, type: "uuid" })
  agentRunId: string | null = null;

  @Column({ name: "parent_comment_id", nullable: true, type: "uuid" })
  parentCommentId: string | null = null;

  @Column({ array: true, default: () => "'{}'::uuid[]", name: "mentioned_user_ids", type: "uuid" })
  mentionedUserIds: string[] = [];

  @Column({ type: "text" })
  body = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  declare createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  declare updatedAt: Date;
}
