import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createIntegrationEventOutboxSql = [
  `CREATE TABLE "integration_outbox_events" ("id" uuid NOT NULL, "workspace_id" uuid NOT NULL, "activity_event_id" uuid, "event_name" text NOT NULL, "actor_user_id" uuid, "entity_type" text NOT NULL, "entity_id" uuid NOT NULL, "payload" jsonb NOT NULL DEFAULT '{}'::jsonb, "occurred_at" timestamptz NOT NULL, "published_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_outbox_events" PRIMARY KEY ("id"), CONSTRAINT "uq_integration_outbox_events_activity_event_id" UNIQUE ("activity_event_id"), CONSTRAINT "fk_integration_outbox_events_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_outbox_events_activity_event" FOREIGN KEY ("activity_event_id") REFERENCES "activity_events" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_outbox_events_actor_user" FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id") ON DELETE SET NULL)`,
  `CREATE INDEX "idx_integration_outbox_events_unpublished" ON "integration_outbox_events" ("published_at", "occurred_at")`,
  `CREATE INDEX "idx_integration_outbox_events_workspace_id" ON "integration_outbox_events" ("workspace_id")`,
  `CREATE TABLE "integration_event_deliveries" ("id" uuid NOT NULL, "outbox_event_id" uuid NOT NULL, "workspace_integration_id" uuid NOT NULL, "plugin_key" text NOT NULL, "plugin_version" text NOT NULL, "status" text NOT NULL DEFAULT 'pending', "attempt_count" integer NOT NULL DEFAULT 0, "available_at" timestamptz NOT NULL DEFAULT now(), "locked_at" timestamptz, "lock_token" uuid, "processed_at" timestamptz, "last_error" text, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_event_deliveries" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_event_deliveries_status" CHECK ("status" IN ('pending', 'processing', 'succeeded', 'dead')), CONSTRAINT "uq_integration_event_deliveries_event_installation" UNIQUE ("outbox_event_id", "workspace_integration_id"), CONSTRAINT "fk_integration_event_deliveries_event" FOREIGN KEY ("outbox_event_id") REFERENCES "integration_outbox_events" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_event_deliveries_workspace_integration" FOREIGN KEY ("workspace_integration_id") REFERENCES "workspace_integrations" ("id") ON DELETE CASCADE)`,
  `CREATE INDEX "idx_integration_event_deliveries_claim" ON "integration_event_deliveries" ("status", "available_at", "locked_at")`,
  `CREATE INDEX "idx_integration_event_deliveries_workspace_integration" ON "integration_event_deliveries" ("workspace_integration_id")`,
  `CREATE FUNCTION "enqueue_integration_activity_event"() RETURNS trigger AS $$ DECLARE integration_event_name text; BEGIN integration_event_name := CASE WHEN NEW.event_type = 'attachment.created' THEN 'attachment.created.v1' WHEN NEW.event_type = 'comment.created' THEN 'comment.created.v1' WHEN NEW.event_type = 'task.archived' THEN 'task.archived.v1' WHEN NEW.event_type = 'task.created' THEN 'task.created.v1' WHEN NEW.event_type LIKE 'task.%' THEN 'task.updated.v1' ELSE NULL END; IF integration_event_name IS NOT NULL THEN INSERT INTO "integration_outbox_events" ("id", "workspace_id", "activity_event_id", "event_name", "actor_user_id", "entity_type", "entity_id", "payload", "occurred_at") VALUES (NEW.id, NEW.workspace_id, NEW.id, integration_event_name, NEW.actor_user_id, NEW.entity_type, NEW.entity_id, NEW.payload || jsonb_build_object('activityEventType', NEW.event_type), NEW.created_at); END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`,
  `CREATE TRIGGER "trg_activity_events_integration_outbox" AFTER INSERT ON "activity_events" FOR EACH ROW EXECUTE FUNCTION "enqueue_integration_activity_event"()`,
] as const;

export const dropIntegrationEventOutboxSql = [
  `DROP TRIGGER "trg_activity_events_integration_outbox" ON "activity_events"`,
  `DROP FUNCTION "enqueue_integration_activity_event"()`,
  `DROP TABLE "integration_event_deliveries"`,
  `DROP TABLE "integration_outbox_events"`,
] as const;

export class CreateIntegrationEventOutbox1783297980000 implements MigrationInterface {
  name = "CreateIntegrationEventOutbox1783297980000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createIntegrationEventOutboxSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropIntegrationEventOutboxSql);
  }
}
