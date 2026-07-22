import type { MigrationInterface, QueryRunner } from "typeorm";
import { executeMigrationQueries } from "./1783296000000-create-core-persistence-tables.js";

export const createIntegrationResourcesSql = [
  `CREATE TABLE "integration_external_resources" ("id" uuid NOT NULL, "connection_id" uuid NOT NULL, "provider_resource_id" varchar(1024) NOT NULL, "resource_kind" varchar(128) NOT NULL, "name" varchar(512) NOT NULL, "mime_type" varchar(255), "web_url" text, "parent_provider_resource_id" varchar(1024), "version" text, "modified_at" timestamptz, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "status" text NOT NULL DEFAULT 'active', "last_synced_at" timestamptz NOT NULL DEFAULT now(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_external_resources" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_external_resources_status" CHECK ("status" IN ('active', 'deleted', 'unavailable')), CONSTRAINT "fk_integration_external_resources_connection" FOREIGN KEY ("connection_id") REFERENCES "integration_connections" ("id") ON DELETE CASCADE)`,
  `CREATE UNIQUE INDEX "uq_integration_external_resources_connection_provider_id" ON "integration_external_resources" ("connection_id", "provider_resource_id")`,
  `CREATE INDEX "idx_integration_external_resources_kind_status" ON "integration_external_resources" ("connection_id", "resource_kind", "status")`,
  `CREATE TABLE "integration_resource_links" ("id" uuid NOT NULL, "external_resource_id" uuid NOT NULL, "target_type" text NOT NULL, "target_id" uuid NOT NULL, "relation" text NOT NULL, "created_by_user_id" uuid, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_resource_links" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_resource_links_target_type" CHECK ("target_type" IN ('workspace', 'task', 'comment', 'attachment')), CONSTRAINT "chk_integration_resource_links_relation" CHECK ("relation" IN ('managed_root', 'managed_container', 'reference', 'export')), CONSTRAINT "fk_integration_resource_links_resource" FOREIGN KEY ("external_resource_id") REFERENCES "integration_external_resources" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_resource_links_created_by_user" FOREIGN KEY ("created_by_user_id") REFERENCES "users" ("id") ON DELETE SET NULL)`,
  `CREATE UNIQUE INDEX "uq_integration_resource_links_resource_target_relation" ON "integration_resource_links" ("external_resource_id", "target_type", "target_id", "relation")`,
  `CREATE INDEX "idx_integration_resource_links_target" ON "integration_resource_links" ("target_type", "target_id", "relation")`,
  `CREATE TABLE "integration_resource_references" ("id" uuid NOT NULL, "connection_id" uuid NOT NULL, "external_resource_id" uuid, "source_type" text NOT NULL, "source_id" uuid NOT NULL, "provider_resource_id" varchar(1024), "url" text NOT NULL, "url_hash" varchar(64) NOT NULL, "status" text NOT NULL DEFAULT 'unresolved', "first_seen_at" timestamptz NOT NULL DEFAULT now(), "last_seen_at" timestamptz NOT NULL DEFAULT now(), "removed_at" timestamptz, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "pk_integration_resource_references" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_resource_references_source_type" CHECK ("source_type" IN ('task_description', 'comment')), CONSTRAINT "chk_integration_resource_references_status" CHECK ("status" IN ('active', 'unresolved', 'removed')), CONSTRAINT "chk_integration_resource_references_url_hash" CHECK ("url_hash" ~ '^[0-9a-f]{64}$'), CONSTRAINT "fk_integration_resource_references_connection" FOREIGN KEY ("connection_id") REFERENCES "integration_connections" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_resource_references_resource" FOREIGN KEY ("external_resource_id") REFERENCES "integration_external_resources" ("id") ON DELETE SET NULL)`,
  `CREATE UNIQUE INDEX "uq_integration_resource_references_source_url" ON "integration_resource_references" ("connection_id", "source_type", "source_id", "url_hash")`,
  `CREATE INDEX "idx_integration_resource_references_source" ON "integration_resource_references" ("source_type", "source_id", "status")`,
  `CREATE INDEX "idx_integration_resource_references_resource" ON "integration_resource_references" ("external_resource_id")`,
  `CREATE TABLE "integration_subscriptions" ("id" uuid NOT NULL, "connection_id" uuid NOT NULL, "external_resource_id" uuid, "provider_subscription_id" varchar(1024) NOT NULL, "provider_cursor" text, "callback_secret_reference" text, "status" text NOT NULL DEFAULT 'active', "expires_at" timestamptz, "renew_after" timestamptz, "last_event_at" timestamptz, "last_error" text, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "pk_integration_subscriptions" PRIMARY KEY ("id"), CONSTRAINT "chk_integration_subscriptions_status" CHECK ("status" IN ('active', 'renewing', 'expired', 'error', 'stopped')), CONSTRAINT "fk_integration_subscriptions_connection" FOREIGN KEY ("connection_id") REFERENCES "integration_connections" ("id") ON DELETE CASCADE, CONSTRAINT "fk_integration_subscriptions_resource" FOREIGN KEY ("external_resource_id") REFERENCES "integration_external_resources" ("id") ON DELETE SET NULL)`,
  `CREATE UNIQUE INDEX "uq_integration_subscriptions_connection_provider_id" ON "integration_subscriptions" ("connection_id", "provider_subscription_id")`,
  `CREATE INDEX "idx_integration_subscriptions_renewal" ON "integration_subscriptions" ("status", "renew_after")`,
  `CREATE INDEX "idx_integration_subscriptions_resource" ON "integration_subscriptions" ("external_resource_id")`,
] as const;

export const dropIntegrationResourcesSql = [
  `DROP TABLE "integration_subscriptions"`,
  `DROP TABLE "integration_resource_references"`,
  `DROP TABLE "integration_resource_links"`,
  `DROP TABLE "integration_external_resources"`,
] as const;

export class CreateIntegrationResources1783298100000 implements MigrationInterface {
  name = "CreateIntegrationResources1783298100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, createIntegrationResourcesSql);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await executeMigrationQueries(queryRunner, dropIntegrationResourcesSql);
  }
}
