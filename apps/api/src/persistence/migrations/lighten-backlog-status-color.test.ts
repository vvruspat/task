import assert from "node:assert/strict";
import test from "node:test";
import {
  lightenBacklogStatusColorSql,
  restoreBacklogStatusColorSql,
} from "./1783297620000-lighten-backlog-status-color.js";

test("Backlog color migration applies the light gray palette color", () => {
  const sql = lightenBacklogStatusColorSql.join("\n");

  assert.match(sql, /#D4D4D8/);
  assert.match(sql, /= 'backlog'/);
});

test("Backlog color migration restores the previous palette color", () => {
  assert.match(restoreBacklogStatusColorSql.join("\n"), /#64748B/);
});
