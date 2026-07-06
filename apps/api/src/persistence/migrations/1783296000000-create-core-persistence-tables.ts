import type { MigrationInterface, QueryRunner } from "typeorm";

type MigrationQueryExecutor = {
  query(sql: string): Promise<unknown>;
};

export const createCorePersistenceTablesSql = [
  `CREATE TABLE "workspaces" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "uq_workspaces_slug" UNIQUE ("slug")
  )`,
  `CREATE TABLE "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "display_name" text NOT NULL,
    "email" text,
    "avatar_url" text,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE "workspace_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "role" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_workspace_members_role" CHECK ("role" IN ('owner', 'admin', 'member', 'guest')),
    CONSTRAINT "fk_workspace_members_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_workspace_members_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uq_workspace_members_workspace_id_user_id" UNIQUE ("workspace_id", "user_id")
  )`,
  `CREATE TABLE "statuses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "name" text NOT NULL,
    "color" text NOT NULL,
    "position" numeric NOT NULL,
    "is_done" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_statuses_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "uq_statuses_workspace_id_name" UNIQUE ("workspace_id", "name")
  )`,
  `CREATE INDEX "idx_workspace_members_workspace_id" ON "workspace_members" ("workspace_id")`,
  `CREATE INDEX "idx_workspace_members_user_id" ON "workspace_members" ("user_id")`,
  `CREATE INDEX "idx_statuses_workspace_id" ON "statuses" ("workspace_id")`,
] as const;

export const dropCorePersistenceTablesSql = [
  `DROP INDEX "idx_statuses_workspace_id"`,
  `DROP INDEX "idx_workspace_members_user_id"`,
  `DROP INDEX "idx_workspace_members_workspace_id"`,
  `DROP TABLE "statuses"`,
  `DROP TABLE "workspace_members"`,
  `DROP TABLE "users"`,
  `DROP TABLE "workspaces"`,
] as const;

export async function executeMigrationQueries(
  queryRunner: MigrationQueryExecutor,
  queries: readonly string[],
): Promise<void> {
  for (const query of queries) {
    await queryRunner.query(query);
  }
}

export class CreateCorePersistenceTables1783296000000 implements MigrationInterface {
  name = "CreateCorePersistenceTables1783296000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createCorePersistenceTablesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropCorePersistenceTablesSql);
  }
}
