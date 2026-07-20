import assert from "node:assert/strict";
import test from "node:test";
import {
  addProjectIssueIdentifiersSql,
  dropProjectIssueIdentifiersSql,
} from "./1783296780000-add-project-issue-identifiers.js";

test("issue identifier migration backfills project keys and per-project task numbers", () => {
  const sql = addProjectIssueIdentifiersSql.join("\n");
  assert.match(sql, /ADD COLUMN "key" text/);
  assert.match(sql, /ADD COLUMN "next_task_number" integer/);
  assert.match(sql, /row_number\(\) OVER/);
  assert.match(sql, /PARTITION BY "project_id"/);
  assert.match(sql, /UNIQUE \("workspace_id", "key"\)/);
  assert.match(sql, /UNIQUE \("project_id", "number"\)/);
});

test("issue identifier migration down removes task fields before project fields", () => {
  assert.ok(
    dropProjectIssueIdentifiersSql.indexOf(`ALTER TABLE "tasks" DROP COLUMN "number"`) <
      dropProjectIssueIdentifiersSql.indexOf(`ALTER TABLE "projects" DROP COLUMN "key"`),
  );
});
