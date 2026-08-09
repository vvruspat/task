import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import { TelegramIdentityEntity } from "../persistence/entities/index.js";
import { hashConnectToken, pairTelegramIdentityForConnection } from "./telegram-connect.service.js";

test("Telegram connect tokens are stored as deterministic SHA-256 hashes", () => {
  const token = "private-connect-token";
  const hash = hashConnectToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/u);
  assert.notEqual(hash, token);
  assert.equal(hashConnectToken(token), hash);
});

test("Telegram connect token pairs an unlinked sender identity with its issuing user", () => {
  const now = new Date("2026-08-09T08:00:00.000Z");
  const identity = pairTelegramIdentityForConnection(null, {
    now,
    telegramId: "123456789",
    userId: "7af3642f-c714-4fca-bc6e-35a40fd8c815",
  });

  assert.equal(identity.telegramId, "123456789");
  assert.equal(identity.userId, "7af3642f-c714-4fca-bc6e-35a40fd8c815");
  assert.equal(identity.linkedAt, now);
  assert.equal(identity.lastSeenAt, now);
});

test("Telegram connect token refreshes an identity already owned by its issuing user", () => {
  const identity = new TelegramIdentityEntity();
  identity.telegramId = "123456789";
  identity.userId = "7af3642f-c714-4fca-bc6e-35a40fd8c815";
  identity.linkedAt = new Date("2026-08-08T08:00:00.000Z");
  const now = new Date("2026-08-09T08:00:00.000Z");

  const pairedIdentity = pairTelegramIdentityForConnection(identity, {
    now,
    telegramId: identity.telegramId,
    userId: identity.userId,
  });

  assert.equal(pairedIdentity, identity);
  assert.equal(pairedIdentity.linkedAt.toISOString(), "2026-08-08T08:00:00.000Z");
  assert.equal(pairedIdentity.lastSeenAt, now);
});

test("Telegram connect token cannot take over an identity owned by another user", () => {
  const identity = new TelegramIdentityEntity();
  identity.telegramId = "123456789";
  identity.userId = "7af3642f-c714-4fca-bc6e-35a40fd8c815";

  assert.throws(
    () =>
      pairTelegramIdentityForConnection(identity, {
        now: new Date("2026-08-09T08:00:00.000Z"),
        telegramId: identity.telegramId,
        userId: "a97fe77e-4aed-42a7-8d2b-0b287b8ab346",
      }),
    ForbiddenException,
  );
});
