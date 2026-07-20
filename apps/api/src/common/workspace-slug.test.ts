import assert from "node:assert/strict";
import test from "node:test";
import { deriveWorkspaceScopedSlug, selectAvailableWorkspaceScopedSlug } from "./workspace-slug.js";

test("deriveWorkspaceScopedSlug creates readable Latin slugs", () => {
  assert.equal(deriveWorkspaceScopedSlug("Запись альбома 2"), "zapis-alboma-2");
  assert.equal(deriveWorkspaceScopedSlug("Album Release"), "album-release");
  assert.equal(deriveWorkspaceScopedSlug("---"), "item");
});

test("selectAvailableWorkspaceScopedSlug resolves collisions locally", () => {
  assert.equal(
    selectAvailableWorkspaceScopedSlug(
      "Album Release",
      new Set(["album-release", "album-release-2"]),
    ),
    "album-release-3",
  );
});
