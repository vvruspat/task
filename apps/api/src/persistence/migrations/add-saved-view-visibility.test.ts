import assert from "node:assert/strict";
import test from "node:test";
import {
  addSavedViewVisibilitySql,
  removeSavedViewVisibilitySql,
} from "./1783297860000-add-saved-view-visibility.js";

test("saved view visibility migration defaults existing views to private", () => {
  const sql = addSavedViewVisibilitySql.join("\n");
  assert.match(sql, /ADD COLUMN "visibility" text NOT NULL DEFAULT 'private'/);
  assert.match(sql, /CHECK \("visibility" IN \('private', 'workspace'\)\)/);
  assert.match(sql, /idx_saved_views_workspace_id_visibility/);
});

test("saved view visibility migration is reversible", () => {
  assert.deepEqual(removeSavedViewVisibilitySql, [
    `DROP INDEX "idx_saved_views_workspace_id_visibility"`,
    `ALTER TABLE "saved_views" DROP CONSTRAINT "chk_saved_views_visibility"`,
    `ALTER TABLE "saved_views" DROP COLUMN "visibility"`,
  ]);
});
