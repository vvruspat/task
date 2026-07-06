import assert from "node:assert/strict";
import test from "node:test";
import {
  createActivityEventsTableSql,
  dropActivityEventsTableSql,
} from "./1783296360000-create-activity-events-table.js";

test("activity events migration creates the activity_events table after attachments exist", () => {
  const createTableStatements = createActivityEventsTableSql
    .filter((query) => query.startsWith("CREATE TABLE"))
    .map((query) => query.match(/^CREATE TABLE "([^"]+)"/)?.[1]);

  assert.deepEqual(createTableStatements, ["activity_events"]);
});

test("activity events migration includes expected columns and constraints", () => {
  const sql = createActivityEventsTableSql.join("\n");

  assert.match(sql, /"workspace_id" uuid NOT NULL/);
  assert.match(sql, /"actor_user_id" uuid/);
  assert.match(sql, /"event_type" text NOT NULL/);
  assert.match(sql, /"entity_type" text NOT NULL/);
  assert.match(sql, /"entity_id" uuid NOT NULL/);
  assert.match(sql, /"payload" jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(sql, /"created_at" timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(
    sql,
    /CONSTRAINT "fk_activity_events_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_activity_events_actor_user_id" FOREIGN KEY \("actor_user_id"\) REFERENCES "users" \("id"\) ON DELETE SET NULL/,
  );
});

test("activity events migration leaves polymorphic entity integrity to application validation", () => {
  const sql = createActivityEventsTableSql.join("\n");

  assert.doesNotMatch(sql, /FOREIGN KEY \("entity_id"\)/);
  assert.doesNotMatch(sql, /REFERENCES "tasks"/);
  assert.doesNotMatch(sql, /REFERENCES "projects"/);
  assert.doesNotMatch(sql, /REFERENCES "comments"/);
  assert.doesNotMatch(sql, /REFERENCES "attachments"/);
});

test("activity events migration includes timeline and entity lookup indexes", () => {
  const sql = createActivityEventsTableSql.join("\n");

  assert.match(
    sql,
    /CREATE INDEX "idx_activity_events_workspace_id_created_at" ON "activity_events" \("workspace_id", "created_at"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_activity_events_workspace_id_entity" ON "activity_events" \("workspace_id", "entity_type", "entity_id"\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_activity_events_workspace_id_actor_user_id" ON "activity_events" \("workspace_id", "actor_user_id"\)/,
  );
});

test("activity events migration down queries drop indexes before the table", () => {
  assert.deepEqual(dropActivityEventsTableSql, [
    `DROP INDEX "idx_activity_events_workspace_id_actor_user_id"`,
    `DROP INDEX "idx_activity_events_workspace_id_entity"`,
    `DROP INDEX "idx_activity_events_workspace_id_created_at"`,
    `DROP TABLE "activity_events"`,
  ]);
});
