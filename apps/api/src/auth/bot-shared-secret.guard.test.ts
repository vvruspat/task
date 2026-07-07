import assert from "node:assert/strict";
import test from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { botSharedSecretHeader, parseBotSharedSecretHeader } from "./bot-shared-secret.guard.js";

const config = { sharedSecret: "bot-secret" };

test("parseBotSharedSecretHeader accepts the configured shared secret", () => {
  assert.equal(parseBotSharedSecretHeader("bot-secret", config), true);
});

test("parseBotSharedSecretHeader rejects missing config", () => {
  assert.throws(() => parseBotSharedSecretHeader("bot-secret", null), UnauthorizedException);
});

test("parseBotSharedSecretHeader rejects missing, array, and invalid header values", () => {
  assert.throws(() => parseBotSharedSecretHeader(undefined, config), UnauthorizedException);
  assert.throws(() => parseBotSharedSecretHeader(["bot-secret"], config), UnauthorizedException);
  assert.throws(() => parseBotSharedSecretHeader("wrong-secret", config), UnauthorizedException);
});

test("bot shared secret header name is stable for OpenAPI clients", () => {
  assert.equal(botSharedSecretHeader, "x-task-bot-secret");
});
