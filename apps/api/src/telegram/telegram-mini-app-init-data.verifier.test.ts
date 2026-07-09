import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  TelegramMiniAppInitDataVerifier,
  type TelegramMiniAppInitDataVerifierConfig,
} from "./telegram-mini-app-init-data.verifier.js";

const botToken = "123456:telegram-bot-token";
const now = new Date("2026-07-09T12:00:00.000Z");
const authDate = String(Math.floor(now.getTime() / 1000));

test("TelegramMiniAppInitDataVerifier returns stable Telegram identity for valid initData", () => {
  const verifier = createVerifier();
  const initData = createSignedInitData({
    authDate,
    queryId: "AAHdF6IQAAAAAN0XohDhrOrc",
    userJson: JSON.stringify({
      id: 123456789,
      first_name: "Alex",
      username: "alex",
    }),
  });

  assert.deepEqual(verifier.verify({ initData }), {
    telegramId: "123456789",
    authDate,
  });
});

test("TelegramMiniAppInitDataVerifier rejects tampered initData identity", () => {
  const verifier = createVerifier();
  const initData = createSignedInitData({
    authDate,
    queryId: "AAHdF6IQAAAAAN0XohDhrOrc",
    userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
  }).replace("123456789", "987654321");

  assert.throws(() => verifier.verify({ initData }), { name: "UnauthorizedException" });
});

test("TelegramMiniAppInitDataVerifier rejects expired initData", () => {
  const verifier = createVerifier();
  const initData = createSignedInitData({
    authDate: String(Math.floor(now.getTime() / 1000) - 86_401),
    queryId: "AAHdF6IQAAAAAN0XohDhrOrc",
    userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
  });

  assert.throws(() => verifier.verify({ initData }), { name: "UnauthorizedException" });
});

test("TelegramMiniAppInitDataVerifier rejects malformed initData", () => {
  const verifier = createVerifier();

  assert.throws(() => verifier.verify({ initData: "auth_date=bad&hash=nothex&user={}" }), {
    name: "BadRequestException",
  });
  assert.throws(() => verifier.verify({ initData: "auth_date=123&hash=abc&user={}" }), {
    name: "BadRequestException",
  });
  assert.throws(
    () => verifier.verify({ initData: createSignedInitData({ authDate, userJson: "{}" }) }),
    { name: "BadRequestException" },
  );
});

test("TelegramMiniAppInitDataVerifier requires bot token configuration", () => {
  const verifier = createVerifier({ botToken: null });
  const initData = createSignedInitData({
    authDate,
    userJson: JSON.stringify({ id: 123456789, first_name: "Alex" }),
  });

  assert.throws(() => verifier.verify({ initData }), { name: "ServiceUnavailableException" });
});

function createVerifier(
  overrides: Partial<TelegramMiniAppInitDataVerifierConfig> = {},
): TelegramMiniAppInitDataVerifier {
  return new TelegramMiniAppInitDataVerifier({
    botToken,
    maxAgeSeconds: 86_400,
    now: () => now,
    ...overrides,
  });
}

type SignedInitDataInput = {
  authDate: string;
  queryId?: string;
  userJson: string;
};

function createSignedInitData(input: SignedInitDataInput): string {
  const fields = new URLSearchParams();

  fields.set("auth_date", input.authDate);
  fields.set("user", input.userJson);

  if (input.queryId !== undefined) {
    fields.set("query_id", input.queryId);
  }

  const dataCheckString = [...fields.entries()]
    .sort(([leftKey], [rightKey]) => compareDataCheckKeys(leftKey, rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  fields.set("hash", hash);

  return fields.toString();
}

function compareDataCheckKeys(leftKey: string, rightKey: string): number {
  if (leftKey < rightKey) {
    return -1;
  }

  if (leftKey > rightKey) {
    return 1;
  }

  return 0;
}
