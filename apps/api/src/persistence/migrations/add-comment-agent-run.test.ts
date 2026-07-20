import assert from "node:assert/strict";
import test from "node:test";
import {
  addCommentAgentRunSql,
  dropCommentAgentRunSql,
} from "./1783297200000-add-comment-agent-run.js";

test("comment agent run migration links agent replies to their run", () => {
  const sql = addCommentAgentRunSql.join("\n");
  assert.match(sql, /ADD COLUMN "agent_run_id" uuid/);
  assert.match(sql, /REFERENCES "agent_runs" \("id"\) ON DELETE SET NULL/);
  assert.match(sql, /CREATE INDEX "idx_comments_agent_run_id"/);
});

test("comment agent run migration removes dependent objects first", () => {
  assert.match(dropCommentAgentRunSql[0], /DROP INDEX/);
  assert.match(dropCommentAgentRunSql[1], /DROP CONSTRAINT/);
  assert.match(dropCommentAgentRunSql[2], /DROP COLUMN/);
});
