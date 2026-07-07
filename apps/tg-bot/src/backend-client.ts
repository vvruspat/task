import type { operations } from "@task/api-client";

type ResolveTelegramContextOperation = operations["TelegramController_resolveContext"];

export type ResolveTelegramContextInput =
  ResolveTelegramContextOperation["requestBody"]["content"]["application/json"];
export type TelegramContextResolutionResponse =
  ResolveTelegramContextOperation["responses"]["200"]["content"]["application/json"];

export type TelegramBackendFetchInit = {
  method: "POST";
  headers: TelegramBackendPostHeaders;
  body: string;
};

export type TelegramBackendPostHeaders = {
  accept: string;
  "content-type": string;
  "x-task-bot-secret": string;
};

export type TelegramBackendFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

export type TelegramBackendFetch = (
  input: string,
  init: TelegramBackendFetchInit,
) => Promise<TelegramBackendFetchResponse>;

export type TelegramBackendClientOptions = {
  baseUrl: string;
  botSharedSecret: string;
  fetch?: TelegramBackendFetch;
};

export type ResolveTelegramContextRequest = {
  body: ResolveTelegramContextInput;
};

export type TelegramBackendClient = {
  resolveTelegramContext(
    request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse>;
};

export class TelegramBackendClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramBackendClientError";
  }
}

export function createTelegramBackendClient(
  options: TelegramBackendClientOptions,
): TelegramBackendClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  return {
    resolveTelegramContext(request: ResolveTelegramContextRequest) {
      return postJson(
        fetchImplementation,
        `${baseUrl}/internal/telegram/context/resolve`,
        options.botSharedSecret,
        request.body,
        readTelegramContextResolutionResponse,
      );
    },
  };
}

async function postJson<ResponseBody>(
  fetchImplementation: TelegramBackendFetch,
  url: string,
  botSharedSecret: string,
  body: ResolveTelegramContextInput,
  readResponse: (value: unknown) => ResponseBody,
): Promise<ResponseBody> {
  const response = await fetchImplementation(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": botSharedSecret,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new TelegramBackendClientError(
      `Backend request failed with ${response.status} ${response.statusText}.`,
    );
  }

  return readResponse(await response.json());
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function readTelegramContextResolutionResponse(value: unknown): TelegramContextResolutionResponse {
  const record = readRecord(value, "Telegram context response");
  const status = readResolutionStatus(record, "status");

  if (status === "telegram_user_unlinked") {
    return { status };
  }

  const userId = readString(record, "userId");

  if (status === "telegram_chat_unlinked") {
    return { status, userId };
  }

  const workspaceId = readString(record, "workspaceId");

  if (status === "user_not_in_chat_workspace") {
    return { status, userId, workspaceId };
  }

  return {
    status,
    userId,
    workspaceId,
    defaultProjectId: readOptionalNullableString(record, "defaultProjectId") ?? null,
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new TelegramBackendClientError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readResolutionStatus(
  record: Record<string, unknown>,
  propertyName: string,
): TelegramContextResolutionResponse["status"] {
  const value = record[propertyName];

  if (
    value !== "resolved" &&
    value !== "telegram_user_unlinked" &&
    value !== "telegram_chat_unlinked" &&
    value !== "user_not_in_chat_workspace"
  ) {
    throw new TelegramBackendClientError(`${propertyName} is invalid.`);
  }

  return value;
}

function readString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new TelegramBackendClientError(`${propertyName} must be a string.`);
  }

  return value;
}

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new TelegramBackendClientError(`${propertyName} must be a string or null.`);
  }

  return value;
}
