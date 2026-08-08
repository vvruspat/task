import { randomUUID } from "node:crypto";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { TelegramChatMessageRecord } from "../types/core-persistence.types.js";

@Entity({ name: "telegram_chat_messages" })
@Index("uq_telegram_chat_messages_chat_message", ["telegramChatId", "telegramMessageId"], {
  unique: true,
})
@Index("idx_telegram_chat_messages_chat_thread_message", [
  "telegramChatId",
  "telegramThreadId",
  "telegramMessageId",
])
export class TelegramChatMessageEntity implements TelegramChatMessageRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "telegram_chat_id", type: "bigint" })
  telegramChatId = "";

  @Column({ name: "telegram_message_id", type: "bigint" })
  telegramMessageId = "";

  @Column({ name: "telegram_thread_id", nullable: true, type: "bigint" })
  telegramThreadId: string | null = null;

  @Column({ name: "reply_to_telegram_message_id", nullable: true, type: "bigint" })
  replyToTelegramMessageId: string | null = null;

  @Column({ name: "sender_telegram_id", type: "bigint" })
  senderTelegramId = "";

  @Column({ name: "sender_display_name", type: "text" })
  senderDisplayName = "";

  @Column({ default: false, name: "sender_is_bot", type: "boolean" })
  senderIsBot = false;

  @Column({ type: "text" })
  text = "";

  @Column({ name: "sent_at", type: "timestamptz" })
  sentAt = new Date(0);

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  declare createdAt: Date;
}
