import type { MigrationInterface, QueryRunner } from "typeorm";

export const createTelegramChatMessagesQueries = [
  `ALTER TABLE "telegram_chats" ALTER COLUMN "history_access_enabled" SET DEFAULT false`,
  `UPDATE "telegram_chats" SET "history_access_enabled" = false`,
  `CREATE TABLE "telegram_chat_messages" ("id" uuid NOT NULL, "telegram_chat_id" bigint NOT NULL, "telegram_message_id" bigint NOT NULL, "telegram_thread_id" bigint, "reply_to_telegram_message_id" bigint, "sender_telegram_id" bigint NOT NULL, "sender_display_name" text NOT NULL, "sender_is_bot" boolean NOT NULL DEFAULT false, "text" text NOT NULL, "sent_at" timestamptz NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_telegram_chat_messages" PRIMARY KEY ("id"), CONSTRAINT "uq_telegram_chat_messages_chat_message" UNIQUE ("telegram_chat_id", "telegram_message_id"), CONSTRAINT "fk_telegram_chat_messages_chat" FOREIGN KEY ("telegram_chat_id") REFERENCES "telegram_chats" ("telegram_chat_id") ON DELETE CASCADE)`,
  `CREATE INDEX "idx_telegram_chat_messages_chat_thread_message" ON "telegram_chat_messages" ("telegram_chat_id", "telegram_thread_id", "telegram_message_id")`,
] as const;

export const dropTelegramChatMessagesQueries = [
  `DROP INDEX "idx_telegram_chat_messages_chat_thread_message"`,
  `DROP TABLE "telegram_chat_messages"`,
  `ALTER TABLE "telegram_chats" ALTER COLUMN "history_access_enabled" SET DEFAULT true`,
] as const;

export class CreateTelegramChatMessages1783298460000 implements MigrationInterface {
  name = "CreateTelegramChatMessages1783298460000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of createTelegramChatMessagesQueries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of dropTelegramChatMessagesQueries) await queryRunner.query(query);
  }
}
