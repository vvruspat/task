import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createAgentChatsSql = [
  `CREATE TABLE "agent_chats" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "title" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_agent_chats_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_agent_chats_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
  )`,
  `CREATE TABLE "agent_chat_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chat_id" uuid NOT NULL,
    "agent_run_id" uuid,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_agent_chat_messages_role" CHECK ("role" IN ('user', 'assistant')),
    CONSTRAINT "fk_agent_chat_messages_chat" FOREIGN KEY ("chat_id") REFERENCES "agent_chats" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_agent_chat_messages_run" FOREIGN KEY ("agent_run_id") REFERENCES "agent_runs" ("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX "idx_agent_chats_workspace_user_updated" ON "agent_chats" ("workspace_id", "user_id", "updated_at")`,
  `CREATE INDEX "idx_agent_chat_messages_chat_created" ON "agent_chat_messages" ("chat_id", "created_at")`,
  `CREATE INDEX "idx_agent_chat_messages_agent_run" ON "agent_chat_messages" ("agent_run_id")`,
] as const;

export const dropAgentChatsSql = [
  `DROP INDEX "idx_agent_chat_messages_agent_run"`,
  `DROP INDEX "idx_agent_chat_messages_chat_created"`,
  `DROP INDEX "idx_agent_chats_workspace_user_updated"`,
  `DROP TABLE "agent_chat_messages"`,
  `DROP TABLE "agent_chats"`,
] as const;

export class CreateAgentChats1783297380000 implements MigrationInterface {
  name = "CreateAgentChats1783297380000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createAgentChatsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropAgentChatsSql);
  }
}
