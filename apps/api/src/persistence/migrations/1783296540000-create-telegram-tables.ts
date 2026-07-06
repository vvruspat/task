import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createTelegramTablesSql = [
  `CREATE TABLE "telegram_identities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "telegram_id" bigint NOT NULL,
    "telegram_username" text,
    "first_name" text,
    "last_name" text,
    "linked_at" timestamptz NOT NULL DEFAULT now(),
    "last_seen_at" timestamptz,
    CONSTRAINT "fk_telegram_identities_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uq_telegram_identities_telegram_id" UNIQUE ("telegram_id")
  )`,
  `CREATE TABLE "telegram_chats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "telegram_chat_id" bigint NOT NULL,
    "title" text,
    "default_project_id" uuid,
    "linked_by_user_id" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_telegram_chats_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_telegram_chats_default_project_workspace" FOREIGN KEY ("default_project_id", "workspace_id") REFERENCES "projects" ("id", "workspace_id") ON DELETE SET NULL ("default_project_id"),
    CONSTRAINT "fk_telegram_chats_linked_by_user_id" FOREIGN KEY ("linked_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uq_telegram_chats_telegram_chat_id" UNIQUE ("telegram_chat_id")
  )`,
  `CREATE INDEX "idx_telegram_identities_user_id" ON "telegram_identities" ("user_id")`,
  `CREATE INDEX "idx_telegram_chats_workspace_id" ON "telegram_chats" ("workspace_id")`,
  `CREATE INDEX "idx_telegram_chats_default_project_id" ON "telegram_chats" ("default_project_id")`,
  `CREATE INDEX "idx_telegram_chats_linked_by_user_id" ON "telegram_chats" ("linked_by_user_id")`,
] as const;

export const dropTelegramTablesSql = [
  `DROP INDEX "idx_telegram_chats_linked_by_user_id"`,
  `DROP INDEX "idx_telegram_chats_default_project_id"`,
  `DROP INDEX "idx_telegram_chats_workspace_id"`,
  `DROP INDEX "idx_telegram_identities_user_id"`,
  `DROP TABLE "telegram_chats"`,
  `DROP TABLE "telegram_identities"`,
] as const;

export class CreateTelegramTables1783296540000 implements MigrationInterface {
  name = "CreateTelegramTables1783296540000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createTelegramTablesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropTelegramTablesSql);
  }
}
