import assert from "node:assert/strict";
import test from "node:test";
import { formatDeliveryError, retryAtForAttempt } from "./integration-outbox.worker.js";

test("integration delivery retries use bounded exponential backoff", () => {
  const now = new Date("2026-07-22T10:00:00.000Z");

  assert.equal(retryAtForAttempt(1, now)?.toISOString(), "2026-07-22T10:00:02.000Z");
  assert.equal(retryAtForAttempt(4, now)?.toISOString(), "2026-07-22T10:00:16.000Z");
  assert.equal(retryAtForAttempt(8, now), null);
});

test("integration delivery errors are bounded and safe for unknown thrown values", () => {
  assert.equal(formatDeliveryError(new Error("network unavailable")), "Error: network unavailable");
  assert.equal(formatDeliveryError("secret string"), "Unknown delivery error");
  assert.equal(formatDeliveryError(new Error("x".repeat(3_000))).length, 2_000);
});
