import assert from "node:assert/strict";
import test from "node:test";
import { repairCommentTimestampsSql } from "./1783297140000-repair-comment-timestamps.js";

test("comment timestamp repair restores epoch rows from their creation activity", () => {
  const sql = repairCommentTimestampsSql.join("\n");

  assert.match(sql, /entity_type.*=.*'comment'/s);
  assert.match(sql, /event_type.*=.*'comment\.created'/s);
  assert.match(sql, /COALESCE\(MIN\("activity_events"\."created_at"\), CURRENT_TIMESTAMP\)/);
  assert.match(sql, /UPDATE "comments"/);
  assert.match(sql, /SET\s+"created_at"/s);
});
