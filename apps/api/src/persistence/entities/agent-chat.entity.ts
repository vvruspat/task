import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { AgentChatRecord } from "../types/core-persistence.types.js";

@Entity({ name: "agent_chats" })
@Index("idx_agent_chats_workspace_user_updated", ["workspaceId", "userId", "updatedAt"])
export class AgentChatEntity implements AgentChatRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ type: "text" })
  title = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
