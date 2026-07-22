import assert from "node:assert/strict";
import test from "node:test";
import { hashOAuthState } from "./google-drive-oauth.service.js";

test("OAuth state persistence uses a deterministic SHA-256 digest", () => {
  const state = "private-oauth-state";
  const digest = hashOAuthState(state);

  assert.equal(digest.length, 64);
  assert.notEqual(digest, state);
  assert.equal(hashOAuthState(state), digest);
  assert.notEqual(hashOAuthState(`${state}-other`), digest);
});
