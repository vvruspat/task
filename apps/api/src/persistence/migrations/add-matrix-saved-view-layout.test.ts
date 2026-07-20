import assert from "node:assert/strict";
import test from "node:test";
import {
  addMatrixSavedViewLayoutSql,
  dropMatrixSavedViewLayoutSql,
} from "./1783297020000-add-matrix-saved-view-layout.js";

test("matrix saved view migration extends and restores the layout constraint", () => {
  assert.match(addMatrixSavedViewLayoutSql.join("\n"), /'list', 'board', 'matrix'/);
  assert.match(dropMatrixSavedViewLayoutSql.join("\n"), /SET "layout" = 'list'/);
  assert.match(dropMatrixSavedViewLayoutSql.join("\n"), /'list', 'board'/);
});
