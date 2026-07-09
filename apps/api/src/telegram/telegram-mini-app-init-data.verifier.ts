import { createHmac, timingSafeEqual } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type {
  VerifiedTelegramMiniAppInitData,
  VerifyTelegramMiniAppInitDataInput,
} from "./telegram.contracts.js";

export type TelegramMiniAppInitDataVerifierConfig = {
  botToken: string | null;
  maxAgeSeconds: number;
  now: () => Date;
};

type WebAppUserRecord = {
  id: string;
};

type WebAppUserPayload = {
  id?: unknown;
};

const initDataSecretKey = "WebAppData";
const telegramUserIdPattern = /^\d+$/u;

@Injectable()
export class TelegramMiniAppInitDataVerifier {
  constructor(private readonly config: TelegramMiniAppInitDataVerifierConfig) {}

  verify(input: VerifyTelegramMiniAppInitDataInput): VerifiedTelegramMiniAppInitData {
    const botToken = this.config.botToken;

    if (botToken === null) {
      throw new ServiceUnavailableException("Telegram Mini App verification is not configured.");
    }

    const params = new URLSearchParams(input.initData);
    const receivedHash = readSingleRequiredParam(params, "hash");
    const authDate = readSingleRequiredParam(params, "auth_date");
    const user = readWebAppUser(readSingleRequiredParam(params, "user"));

    assertFreshAuthDate(authDate, this.config.now(), this.config.maxAgeSeconds);

    if (!isValidHash(params, botToken, receivedHash)) {
      throw new UnauthorizedException("Telegram Mini App initData signature is invalid.");
    }

    return {
      telegramId: user.id,
      authDate,
    };
  }
}

function readSingleRequiredParam(params: URLSearchParams, key: string): string {
  const values = params.getAll(key);
  const value = values[0];

  if (values.length !== 1 || value === undefined || value.length === 0) {
    throw new BadRequestException(`Telegram Mini App initData must include one ${key} field.`);
  }

  return value;
}

function assertFreshAuthDate(authDate: string, now: Date, maxAgeSeconds: number): void {
  if (!telegramUserIdPattern.test(authDate)) {
    throw new BadRequestException("Telegram Mini App auth_date must be a Unix timestamp string.");
  }

  const authDateSeconds = Number(authDate);

  if (!Number.isSafeInteger(authDateSeconds)) {
    throw new BadRequestException("Telegram Mini App auth_date must be a safe Unix timestamp.");
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);

  if (authDateSeconds > nowSeconds || nowSeconds - authDateSeconds > maxAgeSeconds) {
    throw new UnauthorizedException("Telegram Mini App initData is expired.");
  }
}

function isValidHash(params: URLSearchParams, botToken: string, receivedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/iu.test(receivedHash)) {
    throw new BadRequestException("Telegram Mini App hash must be a SHA-256 hex digest.");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([leftKey], [rightKey]) => compareDataCheckKeys(leftKey, rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", initDataSecretKey).update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const receivedHashBuffer = Buffer.from(receivedHash, "hex");
  const calculatedHashBuffer = Buffer.from(calculatedHash, "hex");

  return (
    receivedHashBuffer.length === calculatedHashBuffer.length &&
    timingSafeEqual(receivedHashBuffer, calculatedHashBuffer)
  );
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

function readWebAppUser(value: string): WebAppUserRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException("Telegram Mini App user field must be valid JSON.");
  }

  if (!isWebAppUserPayload(parsed)) {
    throw new BadRequestException("Telegram Mini App user field must be an object.");
  }

  const id = parsed.id;

  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new BadRequestException("Telegram Mini App user id must be a positive safe integer.");
  }

  return {
    id: String(id),
  };
}

function isWebAppUserPayload(value: unknown): value is WebAppUserPayload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
