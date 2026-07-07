import { createHash, timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiHeader } from "@nestjs/swagger";
import { loadApiConfig } from "../config.js";

export const botSharedSecretHeader = "x-task-bot-secret";

export type BotSharedSecretConfig = {
  sharedSecret: string;
};

export const ApiBotSharedSecret = (): MethodDecorator & ClassDecorator =>
  ApiHeader({
    name: botSharedSecretHeader,
    description: "Internal Telegram bot shared secret. Not a user authentication mechanism.",
    required: true,
    schema: { type: "string" },
  });

@Injectable()
export class BotSharedSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<BotSharedSecretRequest>();
    const config = loadApiConfig().botAuth;

    return parseBotSharedSecretHeader(request.headers[botSharedSecretHeader], config);
  }
}

export function parseBotSharedSecretHeader(
  value: BotSharedSecretHeader,
  config: BotSharedSecretConfig | null,
): boolean {
  if (config === null) {
    throw new UnauthorizedException("Telegram bot shared secret is not configured.");
  }

  if (typeof value !== "string" || !secretsMatch(value, config.sharedSecret)) {
    throw new UnauthorizedException(`${botSharedSecretHeader} is invalid.`);
  }

  return true;
}

function secretsMatch(actual: string, expected: string): boolean {
  const actualDigest = createSecretDigest(actual);
  const expectedDigest = createSecretDigest(expected);

  return timingSafeEqual(actualDigest, expectedDigest);
}

function createSecretDigest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

type BotSharedSecretHeader = string | string[] | undefined;

type BotSharedSecretRequest = {
  headers: Record<string, BotSharedSecretHeader>;
};
