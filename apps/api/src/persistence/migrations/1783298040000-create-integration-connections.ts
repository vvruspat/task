import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createIntegrationConnectionsSql = [
  `CREATE TABLE "integration_secrets" ("id" uuid NOT NULL, "algorithm" text NOT NULL DEFAULT 'aes-256-gcm', "key_version" integer NOT NULL DEFAULT 1, "initialization_vector" text NOT NULL, "authentication_tag" text NOT NULL, "ciphertext" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_secrets" PRIMARY KEY ("id"))`,
  `CREATE TABLE "integration_connections" ("id" uuid NOT NULL, "workspace_integration_id" uuid NOT NULL, "provider_account_id" text NOT NULL, "display_name" text, "secret_reference" text NOT NULL, "scopes" text[] NOT NULL DEFAULT '{}', "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" text NOT NULL DEFAULT 'connected', "connected_by_user_id" uuid NOT NULL, "connected_at" timestamptz NOT NULL, "disconnected_at" timestamptz, "last_error" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_connections" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_connections_status" CHECK ("status" IN ('connected', 'disconnected', 'error')), CONSTRAINT "uq_integration_connections_workspace_integration" UNIQUE ("workspace_integration_id"), CONSTRAINT "fk_integration_connections_workspace_integration" FOREIGN KEY ("workspace_integration_id") REFERENCES "workspace_integrations" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_connections_connected_by_user" FOREIGN KEY ("connected_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT)`,
  `CREATE INDEX "idx_integration_connections_provider_account" ON "integration_connections" ("provider_account_id")`,
  `CREATE TABLE "integration_oauth_states" ("id" uuid NOT NULL, "state_hash" varchar(64) NOT NULL, "workspace_integration_id" uuid NOT NULL, "plugin_key" text NOT NULL, "user_id" uuid NOT NULL, "expires_at" timestamptz NOT NULL, "consumed_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_oauth_states" PRIMARY KEY ("id"), CONSTRAINT "uq_integration_oauth_states_state_hash" UNIQUE ("state_hash"), CONSTRAINT "fk_integration_oauth_states_workspace_integration" FOREIGN KEY ("workspace_integration_id") REFERENCES "workspace_integrations" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_oauth_states_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE)`,
  `CREATE INDEX "idx_integration_oauth_states_installation" ON "integration_oauth_states" ("workspace_integration_id", "created_at")`,
  `CREATE INDEX "idx_integration_oauth_states_expiry" ON "integration_oauth_states" ("expires_at", "consumed_at")`,
] as const;

export const dropIntegrationConnectionsSql = [
  `DROP TABLE "integration_oauth_states"`,
  `DROP TABLE "integration_connections"`,
  `DROP TABLE "integration_secrets"`,
] as const;

export class CreateIntegrationConnections1783298040000 implements MigrationInterface {
  name = "CreateIntegrationConnections1783298040000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createIntegrationConnectionsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropIntegrationConnectionsSql);
  }
}
