import { randomUUID } from "node:crypto";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type { TelegramIdentityRecord } from "../types/core-persistence.types.js";

@Entity({ name: "telegram_identities" })
@Index("idx_telegram_identities_user_id", ["userId"])
export class TelegramIdentityEntity implements TelegramIdentityRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string = randomUUID();

  @Column({ name: "user_id", type: "uuid" })
  userId = "";

  @Column({ name: "telegram_id", type: "bigint", unique: true })
  telegramId = "";

  @Column({ name: "telegram_username", nullable: true, type: "text" })
  telegramUsername: string | null = null;

  @Column({ name: "first_name", nullable: true, type: "text" })
  firstName: string | null = null;

  @Column({ name: "last_name", nullable: true, type: "text" })
  lastName: string | null = null;

  @Column({ name: "linked_at", type: "timestamptz" })
  linkedAt = new Date(0);

  @Column({ name: "last_seen_at", nullable: true, type: "timestamptz" })
  lastSeenAt: Date | null = null;
}
