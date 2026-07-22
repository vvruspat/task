import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createWorkspaceIntegrationsSql = [
  `CREATE TABLE "workspace_integrations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "plugin_key" text NOT NULL,
    "plugin_version" text NOT NULL,
    "status" text NOT NULL DEFAULT 'disconnected',
    "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "installed_by_user_id" uuid NOT NULL,
    "connected_by_user_id" uuid,
    "connected_at" timestamptz,
    "disconnected_at" timestamptz,
    "last_error" text,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_workspace_integrations_status" CHECK ("status" IN ('authorizing', 'connected', 'disconnected', 'error')),
    CONSTRAINT "uq_workspace_integrations_workspace_plugin" UNIQUE ("workspace_id", "plugin_key"),
    CONSTRAINT "fk_workspace_integrations_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_workspace_integrations_installed_by_user_id" FOREIGN KEY ("installed_by_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
    CONSTRAINT "fk_workspace_integrations_connected_by_user_id" FOREIGN KEY ("connected_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX "idx_workspace_integrations_workspace_status" ON "workspace_integrations" ("workspace_id", "status")`,
  `CREATE INDEX "idx_workspace_integrations_installed_by_user_id" ON "workspace_integrations" ("installed_by_user_id")`,
  `CREATE INDEX "idx_workspace_integrations_connected_by_user_id" ON "workspace_integrations" ("connected_by_user_id")`,
] as const;

export const dropWorkspaceIntegrationsSql = [`DROP TABLE "workspace_integrations"`] as const;

export class CreateWorkspaceIntegrationsTable1783297920000 implements MigrationInterface {
  name = "CreateWorkspaceIntegrationsTable1783297920000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createWorkspaceIntegrationsSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropWorkspaceIntegrationsSql);
  }
}
