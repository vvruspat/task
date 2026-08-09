import type { MigrationInterface, QueryRunner } from "typeorm";

export const createTelegramConnectIntentsQueries = [
  `CREATE TABLE "telegram_connect_intents" ("id" uuid NOT NULL, "token_hash" text NOT NULL, "telegram_chat_id" bigint NOT NULL, "telegram_id" bigint NOT NULL, "title" text, "expires_at" timestamptz NOT NULL, "consumed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_telegram_connect_intents" PRIMARY KEY ("id"), CONSTRAINT "uq_telegram_connect_intents_token_hash" UNIQUE ("token_hash"))`,
  `CREATE INDEX "idx_telegram_connect_intents_chat_id" ON "telegram_connect_intents" ("telegram_chat_id")`,
] as const;

export const dropTelegramConnectIntentsQueries = [
  `DROP INDEX "idx_telegram_connect_intents_chat_id"`,
  `DROP TABLE "telegram_connect_intents"`,
] as const;

export class CreateTelegramConnectIntents1783298520000 implements MigrationInterface {
  name = "CreateTelegramConnectIntents1783298520000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const query of createTelegramConnectIntentsQueries) await queryRunner.query(query);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const query of dropTelegramConnectIntentsQueries) await queryRunner.query(query);
  }
}
