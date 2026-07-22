import { createHash, timingSafeEqual } from "node:crypto";
import type {
  IntegrationWebhookHandler,
  IntegrationWebhookHeaderValue,
} from "@task/integration-sdk";

export const telegramWebhookSecretHeaderName = "x-telegram-bot-api-secret-token";

export function createTelegramWebhookHandler(
  webhookSecret: string | null,
): IntegrationWebhookHandler {
  if (webhookSecret !== null && (webhookSecret.length === 0 || webhookSecret.length > 256)) {
    throw new Error("Telegram webhook secret must contain between 1 and 256 characters.");
  }

  return {
    async verify(request) {
      if (webhookSecret === null) {
        return { payload: request.payload, status: "accepted" };
      }
      const actualSecret = readTelegramWebhookSecretHeader(request.headers);
      return actualSecret !== null && securelyEqual(actualSecret, webhookSecret)
        ? { payload: request.payload, status: "accepted" }
        : { status: "unauthorized" };
    },
  };
}

function readTelegramWebhookSecretHeader(
  headers: Readonly<Record<string, IntegrationWebhookHeaderValue>>,
): string | null {
  const matchingValues: IntegrationWebhookHeaderValue[] = [];
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === telegramWebhookSecretHeaderName) matchingValues.push(value);
  }
  return matchingValues.length === 1 ? readSingleHeaderValue(matchingValues[0]) : null;
}

function readSingleHeaderValue(value: IntegrationWebhookHeaderValue): string | null {
  if (typeof value === "string") return value;
  if (value === undefined || value.length !== 1) return null;
  return value[0] ?? null;
}

function securelyEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}
