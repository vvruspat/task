import type { TelegramWebhookHandlerOptions } from "./webhook-handler.js";
import {
  handleTelegramWebhookRequest,
  type TelegramWebhookAcceptedResult,
  type TelegramWebhookFailedResult,
  telegramWebhookSecretHeaderName,
} from "./webhook-handler.js";

export type TelegramWebhookHttpHeaderValue = string | readonly string[] | undefined;

export type TelegramWebhookHttpHeaders = Readonly<Record<string, TelegramWebhookHttpHeaderValue>>;

export type TelegramWebhookHttpRequest = {
  method: string;
  headers: TelegramWebhookHttpHeaders;
  body: unknown;
};

export type TelegramWebhookHttpAcceptedResponse = {
  statusCode: 200;
  body: { status: "accepted" };
  result: TelegramWebhookAcceptedResult;
};

export type TelegramWebhookHttpUnauthorizedResponse = {
  statusCode: 401;
  body: { status: "unauthorized" };
};

export type TelegramWebhookHttpMethodNotAllowedResponse = {
  statusCode: 405;
  body: { status: "method_not_allowed" };
};

export type TelegramWebhookHttpFailedResponse = {
  statusCode: 500;
  body: { status: "failed" };
  result: TelegramWebhookFailedResult;
};

export type TelegramWebhookHttpResponse =
  | TelegramWebhookHttpAcceptedResponse
  | TelegramWebhookHttpUnauthorizedResponse
  | TelegramWebhookHttpMethodNotAllowedResponse
  | TelegramWebhookHttpFailedResponse;

export async function handleTelegramWebhookHttpRequest(
  request: TelegramWebhookHttpRequest,
  options: TelegramWebhookHandlerOptions,
): Promise<TelegramWebhookHttpResponse> {
  if (request.method.toUpperCase() !== "POST") {
    return {
      statusCode: 405,
      body: { status: "method_not_allowed" },
    };
  }

  const result = await handleTelegramWebhookRequest(
    {
      update: request.body,
      secretTokenHeader: readTelegramWebhookSecretHeader(request.headers),
    },
    options,
  );

  if (result.status === "unauthorized") {
    return {
      statusCode: 401,
      body: { status: "unauthorized" },
    };
  }

  if (result.status === "failed") {
    return {
      statusCode: 500,
      body: { status: "failed" },
      result,
    };
  }

  return {
    statusCode: 200,
    body: { status: "accepted" },
    result,
  };
}

function readTelegramWebhookSecretHeader(headers: TelegramWebhookHttpHeaders): string | null {
  const matchingValues: TelegramWebhookHttpHeaderValue[] = [];

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === telegramWebhookSecretHeaderName) {
      matchingValues.push(value);
    }
  }

  if (matchingValues.length !== 1) {
    return null;
  }

  return readSingleHeaderValue(matchingValues[0]);
}

function readSingleHeaderValue(value: TelegramWebhookHttpHeaderValue): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined || value.length !== 1) {
    return null;
  }

  return value[0] ?? null;
}
