import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { BadRequestException } from "@nestjs/common";
import { verifyTelegramLoginAuthData } from "./telegram-login-auth.js";

const botToken = "123456:telegram-bot-token";
const now = new Date("2026-08-09T18:00:00.000Z");

test("Telegram login authorization verifies the signed sender identity", () => {
  const authData = createSignedAuthData({
    auth_date: String(Math.floor(now.getTime() / 1_000)),
    first_name: "Alex",
    id: "123456789",
    username: "alex",
  });

  assert.deepEqual(verifyTelegramLoginAuthData(authData, botToken, now), {
    firstName: "Alex",
    lastName: null,
    telegramId: "123456789",
    username: "alex",
  });
});

test("Telegram login authorization rejects tampered, duplicate, and expired values", () => {
  const authData = createSignedAuthData({
    auth_date: String(Math.floor(now.getTime() / 1_000)),
    id: "123456789",
  });

  assert.throws(
    () => verifyTelegramLoginAuthData(authData.replace("123456789", "987654321"), botToken, now),
    BadRequestException,
  );
  assert.throws(
    () => verifyTelegramLoginAuthData(`${authData}&id=123456789`, botToken, now),
    BadRequestException,
  );
  assert.throws(
    () =>
      verifyTelegramLoginAuthData(
        createSignedAuthData({ auth_date: "1786297000", id: "123456789" }),
        botToken,
        now,
      ),
    BadRequestException,
  );
});

function createSignedAuthData(values: Readonly<Record<string, string>>): string {
  const dataCheckString = Object.entries(values)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken, "utf8").digest();
  const hash = createHmac("sha256", secret).update(dataCheckString, "utf8").digest("hex");
  const parameters = new URLSearchParams(values);
  parameters.set("hash", hash);
  return parameters.toString();
}
