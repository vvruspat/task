import type { TelegramBotConfig } from "./config.js";
import type { TelegramBotRuntime } from "./runtime.js";
import type { TelegramUpdateProcessorResult } from "./update-processor.js";

export const telegramWebhookSecretHeaderName = "x-telegram-bot-api-secret-token";

export type TelegramWebhookRequest = {
  update: unknown;
  secretTokenHeader: string | null;
};

export type TelegramWebhookHandlerOptions = {
  config: Pick<TelegramBotConfig, "webhookSecret">;
  runtime: TelegramBotRuntime;
};

export type TelegramWebhookAcceptedResult = {
  status: "accepted";
  result: TelegramUpdateProcessorResult;
};

export type TelegramWebhookUnauthorizedResult = {
  status: "unauthorized";
};

export type TelegramWebhookFailedResult = {
  status: "failed";
  error: TelegramWebhookHandlerError;
};

export type TelegramWebhookHandlingResult =
  | TelegramWebhookAcceptedResult
  | TelegramWebhookUnauthorizedResult
  | TelegramWebhookFailedResult;

export class TelegramWebhookHandlerError extends Error {
  constructor(
    message: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = "TelegramWebhookHandlerError";
  }
}

export async function handleTelegramWebhookRequest(
  request: TelegramWebhookRequest,
  options: TelegramWebhookHandlerOptions,
): Promise<TelegramWebhookHandlingResult> {
  if (!isAuthorizedWebhookRequest(request.secretTokenHeader, options.config.webhookSecret)) {
    return { status: "unauthorized" };
  }

  try {
    return {
      status: "accepted",
      result: await options.runtime.processUpdate(request.update),
    };
  } catch (error) {
    return {
      status: "failed",
      error: new TelegramWebhookHandlerError("Telegram webhook processing failed.", error),
    };
  }
}

function isAuthorizedWebhookRequest(
  secretTokenHeader: string | null,
  webhookSecret: string | null,
): boolean {
  if (webhookSecret === null) {
    return true;
  }

  return secretTokenHeader === webhookSecret;
}
