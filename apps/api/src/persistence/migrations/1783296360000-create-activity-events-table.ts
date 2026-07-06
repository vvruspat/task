import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createActivityEventsTableSql = [
  `CREATE TABLE "activity_events" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "workspace_id" uuid NOT NULL,
    "actor_user_id" uuid,
    "event_type" text NOT NULL,
    "entity_type" text NOT NULL,
    "entity_id" uuid NOT NULL,
    "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "created_at" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "fk_activity_events_workspace_id" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE,
    CONSTRAINT "fk_activity_events_actor_user_id" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL
  )`,
  `CREATE INDEX "idx_activity_events_workspace_id_created_at" ON "activity_events" ("workspace_id", "created_at")`,
  `CREATE INDEX "idx_activity_events_workspace_id_entity" ON "activity_events" ("workspace_id", "entity_type", "entity_id")`,
  `CREATE INDEX "idx_activity_events_workspace_id_actor_user_id" ON "activity_events" ("workspace_id", "actor_user_id")`,
] as const;

export const dropActivityEventsTableSql = [
  `DROP INDEX "idx_activity_events_workspace_id_actor_user_id"`,
  `DROP INDEX "idx_activity_events_workspace_id_entity"`,
  `DROP INDEX "idx_activity_events_workspace_id_created_at"`,
  `DROP TABLE "activity_events"`,
] as const;

export class CreateActivityEventsTable1783296360000 implements MigrationInterface {
  name = "CreateActivityEventsTable1783296360000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createActivityEventsTableSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropActivityEventsTableSql);
  }
}
