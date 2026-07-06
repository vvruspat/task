import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createAttachmentsTableSql = [
  `CREATE TABLE "attachments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "target_type" text NOT NULL,
    "target_id" uuid NOT NULL,
    "kind" text NOT NULL,
    "title" text,
    "url" text,
    "storage_key" text,
    "telegram_file_id" text,
    "mime_type" text,
    "size_bytes" bigint,
    "created_by_user_id" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_attachments_target_type" CHECK ("target_type" IN ('task', 'project', 'comment')),
    CONSTRAINT "chk_attachments_kind" CHECK ("kind" IN ('file', 'link', 'telegram_file')),
    CONSTRAINT "fk_attachments_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_attachments_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
  )`,
  `CREATE INDEX "idx_attachments_workspace_id_target" ON "attachments" ("workspace_id", "target_type", "target_id")`,
  `CREATE INDEX "idx_attachments_workspace_id_created_by_user_id" ON "attachments" ("workspace_id", "created_by_user_id")`,
] as const;

export const dropAttachmentsTableSql = [
  `DROP INDEX "idx_attachments_workspace_id_created_by_user_id"`,
  `DROP INDEX "idx_attachments_workspace_id_target"`,
  `DROP TABLE "attachments"`,
] as const;

export class CreateAttachmentsTable1783296300000 implements MigrationInterface {
  name = "CreateAttachmentsTable1783296300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createAttachmentsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropAttachmentsTableSql);
  }
}
