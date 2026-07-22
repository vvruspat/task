import type { TelegramWebhookHandlerOptions } from "./webhook-handler.js";
import {
  handleTelegramWebhookRequest,
  type TelegramWebhookAcceptedResult,
  type TelegramWebhookFailedResult,
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
      headers: request.headers,
      update: request.body,
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
