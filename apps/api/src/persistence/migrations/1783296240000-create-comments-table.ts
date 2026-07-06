import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createCommentsTableSql = [
  `CREATE TABLE "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "task_id" uuid NOT NULL,
    "author_user_id" uuid NOT NULL,
    "body" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_comments_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_comments_task_workspace" FOREIGN KEY ("task_id", "workspace_id") REFERENCES "tasks" ("id", "workspace_id") ON DELETE CASCADE,
    CONSTRAINT "fk_comments_author_user_id" FOREIGN KEY ("author_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
  )`,
  `CREATE INDEX "idx_comments_workspace_id_task_id" ON "comments" ("workspace_id", "task_id")`,
  `CREATE INDEX "idx_comments_workspace_id_author_user_id" ON "comments" ("workspace_id", "author_user_id")`,
] as const;

export const dropCommentsTableSql = [
  `DROP INDEX "idx_comments_workspace_id_author_user_id"`,
  `DROP INDEX "idx_comments_workspace_id_task_id"`,
  `DROP TABLE "comments"`,
] as const;

export class CreateCommentsTable1783296240000 implements MigrationInterface {
  name = "CreateCommentsTable1783296240000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createCommentsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropCommentsTableSql);
  }
}
