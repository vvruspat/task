import assert from "node:assert/strict";
import test from "node:test";
import {
  allowMissingTaskStatusesSql,
  requireTaskStatusesSql,
} from "./1783297500000-require-task-statuses.js";

test("required task status migration backfills Backlog and enforces the invariant", () => {
  const sql = requireTaskStatusesSql.join("\n");

  assert.match(sql, /WHERE task\."status_id" IS NULL/);
  assert.match(sql, /'backlog', 'беклог', 'бэклог'/);
  assert.match(sql, /ALTER COLUMN "status_id" SET NOT NULL/);
  assert.match(sql, /ON DELETE RESTRICT/);
});

test("required task status migration is reversible", () => {
  const sql = allowMissingTaskStatusesSql.join("\n");

  assert.match(sql, /ALTER COLUMN "status_id" DROP NOT NULL/);
  assert.match(sql, /ON DELETE SET NULL \("status_id"\)/);
});
