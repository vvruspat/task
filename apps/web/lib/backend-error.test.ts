import assert from "node:assert/strict";
import test from "node:test";
import { readBackendErrorMessage } from "./backend-error.ts";

test("readBackendErrorMessage returns a safe backend message", () => {
  assert.equal(
    readBackendErrorMessage(
      JSON.stringify({ message: "Brevo could not send the invitation email." }),
    ),
    "Brevo could not send the invitation email.",
  );
});

test("readBackendErrorMessage rejects malformed and incomplete bodies", () => {
  assert.equal(readBackendErrorMessage("not-json"), null);
  assert.equal(readBackendErrorMessage(JSON.stringify({ error: "Service Unavailable" })), null);
  assert.equal(readBackendErrorMessage(null), null);
});
