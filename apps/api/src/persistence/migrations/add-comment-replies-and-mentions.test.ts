import assert from "node:assert/strict";
import test from "node:test";
import {
  addCommentRepliesAndMentionsSql,
  dropCommentRepliesAndMentionsSql,
} from "./1783297080000-add-comment-replies-and-mentions.js";

test("comment replies migration adds one-level reply and mention storage", () => {
  const sql = addCommentRepliesAndMentionsSql.join("\n");
  assert.match(sql, /ADD COLUMN "parent_comment_id" uuid/);
  assert.match(sql, /ADD COLUMN "mentioned_user_ids" uuid\[\] NOT NULL/);
  assert.match(sql, /REFERENCES "comments" \("id"\) ON DELETE CASCADE/);
  assert.match(sql, /CREATE INDEX "idx_comments_parent_comment_id"/);
});

test("comment replies migration drops dependent objects before columns", () => {
  assert.match(dropCommentRepliesAndMentionsSql[0], /DROP INDEX/);
  assert.match(dropCommentRepliesAndMentionsSql[1], /DROP CONSTRAINT/);
  assert.match(dropCommentRepliesAndMentionsSql.at(-1) ?? "", /DROP COLUMN "parent_comment_id"/);
});
