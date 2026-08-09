import { randomUUID } from "node:crypto";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { TelegramConnectIntentRecord } from "../types/core-persistence.types.js";

@Entity({ name: "telegram_connect_intents" })
@Index("uq_telegram_connect_intents_token_hash", ["tokenHash"], { unique: true })
@Index("idx_telegram_connect_intents_chat_id", ["telegramChatId"])
export class TelegramConnectIntentEntity implements TelegramConnectIntentRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "token_hash", type: "text" })
  tokenHash = "";

  @Column({ name: "telegram_chat_id", type: "bigint" })
  telegramChatId = "";

  @Column({ name: "telegram_id", type: "bigint" })
  telegramId = "";

  @Column({ nullable: true, type: "text" })
  title: string | null = null;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt = new Date(0);

  @Column({ name: "consumed_at", nullable: true, type: "timestamptz" })
  consumedAt: Date | null = null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
