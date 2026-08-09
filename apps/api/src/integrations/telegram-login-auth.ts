import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException } from "@nestjs/common";

const telegramIdPattern = /^\d{1,20}$/u;
const authDatePattern = /^\d{1,12}$/u;
const hashPattern = /^[a-f0-9]{64}$/u;
const maxAuthDataLength = 4_096;
const maxAuthAgeMs = 10 * 60_000;
const maxFutureSkewMs = 30_000;
const optionalFieldLimits = {
  first_name: 256,
  last_name: 256,
  photo_url: 2_048,
  username: 64,
} as const;

export type TelegramLoginIdentity = {
  telegramId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

export function verifyTelegramLoginAuthData(
  authData: string,
  botToken: string,
  now: Date = new Date(),
): TelegramLoginIdentity {
  if (authData.length === 0 || authData.length > maxAuthDataLength) throw invalidAuthData();
  const params = new URLSearchParams(authData);
  const entries = [...params.entries()];
  const keys = new Set<string>();
  for (const [key] of entries) {
    if (keys.has(key)) throw invalidAuthData();
    keys.add(key);
  }
  const telegramId = params.get("id");
  const authDate = params.get("auth_date");
  const hash = params.get("hash");
  if (
    telegramId === null ||
    !telegramIdPattern.test(telegramId) ||
    authDate === null ||
    !authDatePattern.test(authDate) ||
    hash === null ||
    !hashPattern.test(hash)
  ) {
    throw invalidAuthData();
  }
  for (const [key, limit] of Object.entries(optionalFieldLimits)) {
    const value = params.get(key);
    if (value !== null && (value.length === 0 || value.length > limit)) throw invalidAuthData();
  }
  const authTimeMs = Number(authDate) * 1_000;
  if (
    !Number.isSafeInteger(authTimeMs) ||
    authTimeMs > now.getTime() + maxFutureSkewMs ||
    now.getTime() - authTimeMs > maxAuthAgeMs
  ) {
    throw invalidAuthData();
  }
  const dataCheckString = entries
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => compareTelegramAuthKeys(left, right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHash("sha256").update(botToken, "utf8").digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString, "utf8").digest();
  const receivedHash = Buffer.from(hash, "hex");
  if (receivedHash.length !== expectedHash.length || !timingSafeEqual(receivedHash, expectedHash)) {
    throw invalidAuthData();
  }
  return {
    telegramId,
    firstName: params.get("first_name"),
    lastName: params.get("last_name"),
    username: params.get("username"),
  };
}

function compareTelegramAuthKeys(left: string, right: string): number {
  if (left < right) return -1;
  return left > right ? 1 : 0;
}

function invalidAuthData(): BadRequestException {
  return new BadRequestException("Telegram authorization data is invalid or expired.");
}
