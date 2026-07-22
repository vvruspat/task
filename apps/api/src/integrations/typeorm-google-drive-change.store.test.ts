import assert from "node:assert/strict";
import test from "node:test";
import { stableGoogleDriveActivityEventId } from "./typeorm-google-drive-change.store.js";

test("Google Drive activity IDs are stable UUIDs for retry deduplication", () => {
  const identity = "connection:file:2026-07-22T12:00:00Z:7:changed:task";
  const first = stableGoogleDriveActivityEventId(identity);

  assert.equal(first, stableGoogleDriveActivityEventId(identity));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.notEqual(first, stableGoogleDriveActivityEventId(`${identity}:other`));
});
