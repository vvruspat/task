import assert from "node:assert/strict";
import test from "node:test";
import {
  refreshDefaultProjectStatusesSql,
  restoreDefaultProjectStatusesSql,
} from "./1783297440000-refresh-default-project-statuses.js";

test("default status migration refreshes colors and adds terminal statuses", () => {
  const upSql = refreshDefaultProjectStatusesSql.join("\n");

  for (const color of [
    "#64748B",
    "#6366F1",
    "#0EA5E9",
    "#8B5CF6",
    "#F59E0B",
    "#22A06B",
    "#B76E79",
    "#E5484D",
  ]) {
    assert.match(upSql, new RegExp(color));
  }
  assert.match(upSql, /'Won’t do'/);
  assert.match(upSql, /'Canceled'/);
  assert.match(upSql, /"is_done"/);
  assert.match(upSql, /WHERE NOT EXISTS/);
});

test("default status migration can restore the previous workflow", () => {
  const downSql = restoreDefaultProjectStatusesSql.join("\n");

  assert.match(downSql, /DELETE FROM "statuses"/);
  assert.match(downSql, /#8B8D98/);
  assert.match(downSql, /#30A46C/);
});
