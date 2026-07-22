import type { IntegrationWebhookHeaderValue } from "@task/integration-sdk";

export { telegramWebhookSecretHeaderName } from "@task/integration-telegram";

import type { TelegramBotRuntime } from "./runtime.js";
import type { TelegramUpdateProcessorResult } from "./update-processor.js";

export type TelegramWebhookRequest = {
  headers: Readonly<Record<string, IntegrationWebhookHeaderValue>>;
  update: unknown;
};

export type TelegramWebhookHandlerOptions = {
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
  try {
    const verification = await options.runtime.verifyWebhook({
      headers: request.headers,
      payload: request.update,
    });
    if (verification.status === "unauthorized") return verification;
    return {
      status: "accepted",
      result: await options.runtime.processUpdate(verification.payload),
    };
  } catch (error) {
    return {
      status: "failed",
      error: new TelegramWebhookHandlerError("Telegram webhook processing failed.", error),
    };
  }
}
