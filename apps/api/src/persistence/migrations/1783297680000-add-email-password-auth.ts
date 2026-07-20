import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const addEmailPasswordAuthSql = [
  `CREATE UNIQUE INDEX "uq_users_normalized_email" ON "users" (LOWER("email")) WHERE "email" IS NOT NULL`,
  `CREATE TABLE "password_credentials" (
    "user_id" uuid PRIMARY KEY,
    "password_hash" text NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_password_credentials_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
  )`,
  `CREATE TABLE "auth_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "token_hash" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "revoked_at" timestamptz,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_auth_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uq_auth_sessions_token_hash" UNIQUE ("token_hash")
  )`,
  `CREATE INDEX "idx_auth_sessions_user_id" ON "auth_sessions" ("user_id")`,
  `CREATE INDEX "idx_auth_sessions_expires_at" ON "auth_sessions" ("expires_at")`,
] as const;

export const dropEmailPasswordAuthSql = [
  `DROP INDEX "idx_auth_sessions_expires_at"`,
  `DROP INDEX "idx_auth_sessions_user_id"`,
  `DROP TABLE "auth_sessions"`,
  `DROP TABLE "password_credentials"`,
  `DROP INDEX "uq_users_normalized_email"`,
] as const;

export class AddEmailPasswordAuth1783297680000 implements MigrationInterface {
  name = "AddEmailPasswordAuth1783297680000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, addEmailPasswordAuthSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropEmailPasswordAuthSql);
  }
}
