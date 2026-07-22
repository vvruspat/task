import assert from "node:assert/strict";
import test from "node:test";
import { isSavedViewVisibleToUser } from "./typeorm-views.store.js";

const ownerUserId = "11111111-1111-4111-8111-111111111111";
const memberUserId = "22222222-2222-4222-8222-222222222222";

test("private saved views are visible only to their owner", () => {
  const view = { userId: ownerUserId, visibility: "private" as const };
  assert.equal(isSavedViewVisibleToUser(view, ownerUserId), true);
  assert.equal(isSavedViewVisibleToUser(view, memberUserId), false);
});

test("workspace saved views are visible to every workspace member", () => {
  const view = { userId: ownerUserId, visibility: "workspace" as const };
  assert.equal(isSavedViewVisibleToUser(view, ownerUserId), true);
  assert.equal(isSavedViewVisibleToUser(view, memberUserId), true);
});
