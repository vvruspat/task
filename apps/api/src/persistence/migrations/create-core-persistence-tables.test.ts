import assert from "node:assert/strict";
import test from "node:test";
import {
  createCorePersistenceTablesSql,
  dropCorePersistenceTablesSql,
  executeMigrationQueries,
} from "./1783296000000-create-core-persistence-tables.js";

class RecordingQueryRunner {
  readonly queries: string[] = [];

  async query(sql: string): Promise<unknown> {
    this.queries.push(sql);
    return undefined;
  }
}

test("core persistence migration creates only the initial core tables", () => {
  const createTableSql = createCorePersistenceTablesSql.filter((sql) =>
    sql.startsWith("CREATE TABLE"),
  );

  assert.deepEqual(
    createTableSql.map((sql) => sql.match(/^CREATE TABLE "([^"]+)"/)?.[1]),
    ["workspaces", "users", "workspace_members", "statuses"],
  );
});

test("core persistence migration includes expected constraints and indexes", () => {
  const sql = createCorePersistenceTablesSql.join("\n");

  assert.match(sql, /CONSTRAINT "uq_workspaces_slug" UNIQUE \("slug"\)/);
  assert.match(
    sql,
    /CONSTRAINT "uq_workspace_members_workspace_id_user_id" UNIQUE \("workspace_id", "user_id"\)/,
  );
  assert.match(
    sql,
    /CONSTRAINT "chk_workspace_members_role" CHECK \("role" IN \('owner', 'admin', 'member', 'guest'\)\)/,
  );
  assert.match(sql, /CONSTRAINT "uq_statuses_workspace_id_name" UNIQUE \("workspace_id", "name"\)/);
  assert.match(
    sql,
    /CONSTRAINT "fk_workspace_members_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_workspace_members_user_id" FOREIGN KEY \("user_id"\) REFERENCES "users" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CONSTRAINT "fk_statuses_workspace_id" FOREIGN KEY \("workspace_id"\) REFERENCES "workspaces" \("id"\) ON DELETE CASCADE/,
  );
  assert.match(
    sql,
    /CREATE INDEX "idx_workspace_members_workspace_id" ON "workspace_members" \("workspace_id"\)/,
  );
  assert.match(sql, /CREATE INDEX "idx_statuses_workspace_id" ON "statuses" \("workspace_id"\)/);
});

test("migration query executor runs queries in order", async () => {
  const queryRunner = new RecordingQueryRunner();

  await executeMigrationQueries(queryRunner, createCorePersistenceTablesSql);

  assert.deepEqual(queryRunner.queries, [...createCorePersistenceTablesSql]);
  assert.deepEqual(dropCorePersistenceTablesSql, [
    `DROP INDEX "idx_statuses_workspace_id"`,
    `DROP INDEX "idx_workspace_members_user_id"`,
    `DROP INDEX "idx_workspace_members_workspace_id"`,
    `DROP TABLE "statuses"`,
    `DROP TABLE "workspace_members"`,
    `DROP TABLE "users"`,
    `DROP TABLE "workspaces"`,
  ]);
});
