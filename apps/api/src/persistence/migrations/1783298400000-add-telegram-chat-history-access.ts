import type { MigrationInterface, QueryRunner } from "typeorm";

export const addTelegramChatHistoryAccessQuery = `ALTER TABLE "telegram_chats" ADD COLUMN "history_access_enabled" boolean NOT NULL DEFAULT false`;

export const removeTelegramChatHistoryAccessQuery = `ALTER TABLE "telegram_chats" DROP COLUMN "history_access_enabled"`;

export class AddTelegramChatHistoryAccess1783298400000 implements MigrationInterface {
  name = "AddTelegramChatHistoryAccess1783298400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(addTelegramChatHistoryAccessQuery);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(removeTelegramChatHistoryAccessQuery);
  }
}
