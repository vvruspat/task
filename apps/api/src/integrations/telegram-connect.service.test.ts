import assert from "node:assert/strict";
import test from "node:test";
import { hashConnectToken } from "./telegram-connect.service.js";

test("Telegram connect tokens are stored as deterministic SHA-256 hashes", () => {
  const token = "private-connect-token";
  const hash = hashConnectToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/u);
  assert.notEqual(hash, token);
  assert.equal(hashConnectToken(token), hash);
});
