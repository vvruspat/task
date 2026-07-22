import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addEmailInvitationsSql = [
  `ALTER TABLE "invites" ADD COLUMN "email" text`,
  `UPDATE "invites" AS invite
   SET "email" = lower("user"."email")
   FROM "users" AS "user"
   WHERE invite."invited_user_id" = "user"."id" AND "user"."email" IS NOT NULL`,
  `DELETE FROM "invites" WHERE "email" IS NULL`,
  `ALTER TABLE "invites" ALTER COLUMN "email" SET NOT NULL`,
  `ALTER TABLE "invites" ADD COLUMN "revoked_at" timestamptz`,
  `ALTER TABLE "invites" DROP CONSTRAINT "chk_invites_role"`,
  `ALTER TABLE "invites" ADD CONSTRAINT "chk_invites_role" CHECK ("role" IN ('admin', 'member', 'guest'))`,
  `CREATE INDEX "idx_invites_workspace_id_email" ON "invites" ("workspace_id", lower("email"))`,
  `CREATE UNIQUE INDEX "uq_invites_active_workspace_email" ON "invites" ("workspace_id", lower("email")) WHERE "used_at" IS NULL AND "revoked_at" IS NULL`,
] as const;

export const removeEmailInvitationsSql = [
  `DROP INDEX "uq_invites_active_workspace_email"`,
  `DROP INDEX "idx_invites_workspace_id_email"`,
  `ALTER TABLE "invites" DROP CONSTRAINT "chk_invites_role"`,
  `ALTER TABLE "invites" ADD CONSTRAINT "chk_invites_role" CHECK ("role" IN ('owner', 'admin', 'member', 'guest'))`,
  `ALTER TABLE "invites" DROP COLUMN "revoked_at"`,
  `ALTER TABLE "invites" DROP COLUMN "email"`,
] as const;

export class AddEmailInvitations1783297800000 implements MigrationInterface {
  name = "AddEmailInvitations1783297800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addEmailInvitationsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, removeEmailInvitationsSql);
  }
}
