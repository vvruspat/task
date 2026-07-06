import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createInvitesTableSql = [
  `CREATE TABLE "invites" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "invited_user_id" uuid,
    "token_hash" text NOT NULL,
    "role" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "used_at" timestamptz,
    "created_by_user_id" uuid NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_invites_role" CHECK ("role" IN ('owner', 'admin', 'member', 'guest')),
    CONSTRAINT "fk_invites_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_invites_invited_user_id" FOREIGN KEY ("invited_user_id") REFERENCES "users" ("id") ON DELETE SET NULL,
    CONSTRAINT "fk_invites_created_by_user_id" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "uq_invites_token_hash" UNIQUE ("token_hash")
  )`,
  `CREATE INDEX "idx_invites_workspace_id_expires_at" ON "invites" ("workspace_id", "expires_at")`,
  `CREATE INDEX "idx_invites_workspace_id_invited_user_id" ON "invites" ("workspace_id", "invited_user_id")`,
  `CREATE INDEX "idx_invites_created_by_user_id" ON "invites" ("created_by_user_id")`,
] as const;

export const dropInvitesTableSql = [
  `DROP INDEX "idx_invites_created_by_user_id"`,
  `DROP INDEX "idx_invites_workspace_id_invited_user_id"`,
  `DROP INDEX "idx_invites_workspace_id_expires_at"`,
  `DROP TABLE "invites"`,
] as const;

export class CreateInvitesTable1783296600000 implements MigrationInterface {
  name = "CreateInvitesTable1783296600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createInvitesTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropInvitesTableSql);
  }
}
