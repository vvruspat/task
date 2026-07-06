import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { TelegramChatRecord } from "../types/core-persistence.types.js";

@Entity({ name: "telegram_chats" })
@Index("idx_telegram_chats_workspace_id", ["workspaceId"])
@Index("idx_telegram_chats_default_project_id", ["defaultProjectId"])
@Index("idx_telegram_chats_linked_by_user_id", ["linkedByUserId"])
export class TelegramChatEntity implements TelegramChatRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "telegram_chat_id", type: "bigint", unique: true })
  telegramChatId = "";

  @Column({ nullable: true, type: "text" })
  title: string | null = null;

  @Column({ name: "default_project_id", nullable: true, type: "uuid" })
  defaultProjectId: string | null = null;

  @Column({ name: "linked_by_user_id", type: "uuid" })
  linkedByUserId = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt = new Date(0);
}
