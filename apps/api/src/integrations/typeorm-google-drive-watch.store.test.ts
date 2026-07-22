import assert from "node:assert/strict";
import test from "node:test";
import { renewalTimeForExpiration } from "./typeorm-google-drive-watch.store.js";

test("Drive watch renewal is scheduled before channel expiration", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const expiration = new Date("2026-07-28T12:00:00.000Z");
  const renewAfter = renewalTimeForExpiration(now, expiration);
  assert.equal(renewAfter.toISOString(), "2026-07-27T07:12:00.000Z");
  assert.ok(renewAfter < expiration);
});
