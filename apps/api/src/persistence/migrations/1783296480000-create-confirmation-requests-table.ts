import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createConfirmationRequestsTableSql = [
  `ALTER TABLE "agent_runs" ADD CONSTRAINT "uq_agent_runs_id_workspace_id" UNIQUE ("id", "workspace_id")`,
  `CREATE TABLE "confirmation_requests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "agent_run_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "kind" text NOT NULL,
    "preview" jsonb NOT NULL,
    "status" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    "updated_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "chk_confirmation_requests_status" CHECK ("status" IN ('pending', 'confirmed', 'cancelled', 'expired')),
    CONSTRAINT "fk_confirmation_requests_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_confirmation_requests_agent_run_workspace" FOREIGN KEY ("agent_run_id", "workspace_id") REFERENCES "agent_runs" ("id", "workspace_id") ON DELETE CASCADE,
    CONSTRAINT "fk_confirmation_requests_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
  )`,
  `CREATE INDEX "idx_confirmation_requests_workspace_id_user_id_status" ON "confirmation_requests" ("workspace_id", "user_id", "status")`,
  `CREATE INDEX "idx_confirmation_requests_agent_run_id" ON "confirmation_requests" ("agent_run_id")`,
  `CREATE INDEX "idx_confirmation_requests_workspace_id_expires_at" ON "confirmation_requests" ("workspace_id", "expires_at")`,
] as const;

export const dropConfirmationRequestsTableSql = [
  `DROP INDEX "idx_confirmation_requests_workspace_id_expires_at"`,
  `DROP INDEX "idx_confirmation_requests_agent_run_id"`,
  `DROP INDEX "idx_confirmation_requests_workspace_id_user_id_status"`,
  `DROP TABLE "confirmation_requests"`,
  `ALTER TABLE "agent_runs" DROP CONSTRAINT "uq_agent_runs_id_workspace_id"`,
] as const;

export class CreateConfirmationRequestsTable1783296480000 implements MigrationInterface {
  name = "CreateConfirmationRequestsTable1783296480000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createConfirmationRequestsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropConfirmationRequestsTableSql);
  }
}
