import type { operations } from "@task/api-client";

type ResolveTelegramContextOperation = operations["TelegramController_resolveContext"];
type CreateTelegramAgentRunOperation = operations["AgentController_createTelegramRun"];
type HandleTelegramConfirmationCallbackOperation =
  operations["TelegramController_handleConfirmationCallback"];

export type ResolveTelegramContextInput =
  ResolveTelegramContextOperation["requestBody"]["content"]["application/json"];
export type TelegramContextResolutionResponse =
  ResolveTelegramContextOperation["responses"]["200"]["content"]["application/json"];
export type CreateTelegramAgentRunInput =
  CreateTelegramAgentRunOperation["requestBody"]["content"]["application/json"];
export type TelegramAgentRunIntakeResponse =
  CreateTelegramAgentRunOperation["responses"]["201"]["content"]["application/json"];
export type TelegramConfirmationCallbackInput =
  HandleTelegramConfirmationCallbackOperation["requestBody"]["content"]["application/json"];
export type TelegramConfirmationCallbackResponse =
  HandleTelegramConfirmationCallbackOperation["responses"]["200"]["content"]["application/json"];

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

export type CreateTelegramAgentRunRequest = {
  body: CreateTelegramAgentRunInput;
};

export type HandleTelegramConfirmationCallbackRequest = {
  body: TelegramConfirmationCallbackInput;
};

export type TelegramBackendClient = {
  resolveTelegramContext(
    request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse>;
  createTelegramAgentRun(
    request: CreateTelegramAgentRunRequest,
  ): Promise<TelegramAgentRunIntakeResponse>;
  handleTelegramConfirmationCallback(
    request: HandleTelegramConfirmationCallbackRequest,
  ): Promise<TelegramConfirmationCallbackResponse>;
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
    createTelegramAgentRun(request: CreateTelegramAgentRunRequest) {
      return postJson(
        fetchImplementation,
        `${baseUrl}/internal/agent/telegram/runs`,
        options.botSharedSecret,
        request.body,
        readTelegramAgentRunIntakeResponse,
      );
    },
    handleTelegramConfirmationCallback(request: HandleTelegramConfirmationCallbackRequest) {
      return postJson(
        fetchImplementation,
        `${baseUrl}/internal/telegram/confirmations/callback`,
        options.botSharedSecret,
        request.body,
        readTelegramConfirmationCallbackResponse,
      );
    },
  };
}

async function postJson<ResponseBody>(
  fetchImplementation: TelegramBackendFetch,
  url: string,
  botSharedSecret: string,
  body:
    | ResolveTelegramContextInput
    | CreateTelegramAgentRunInput
    | TelegramConfirmationCallbackInput,
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

function readTelegramAgentRunIntakeResponse(value: unknown): TelegramAgentRunIntakeResponse {
  const record = readRecord(value, "Telegram agent run intake response");

  return {
    agentRunId: readString(record, "agentRunId"),
    workspaceId: readString(record, "workspaceId"),
    userId: readString(record, "userId"),
    source: readAgentRunSource(record, "source"),
    sourceMessageId: readOptionalNullableString(record, "sourceMessageId") ?? null,
    status: readAgentRunStatus(record, "status"),
    responseText: readString(record, "responseText"),
    createdAt: readString(record, "createdAt"),
  };
}

function readTelegramConfirmationCallbackResponse(
  value: unknown,
): TelegramConfirmationCallbackResponse {
  const record = readRecord(value, "Telegram confirmation callback response");

  return {
    confirmationRequestId: readString(record, "confirmationRequestId"),
    action: readConfirmationCallbackAction(record, "action"),
    status: readConfirmationCallbackStatus(record, "status"),
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

function readAgentRunSource(
  record: Record<string, unknown>,
  propertyName: string,
): TelegramAgentRunIntakeResponse["source"] {
  const value = record[propertyName];

  if (value !== "telegram" && value !== "web" && value !== "mini_app") {
    throw new TelegramBackendClientError(`${propertyName} is invalid.`);
  }

  return value;
}

function readAgentRunStatus(
  record: Record<string, unknown>,
  propertyName: string,
): TelegramAgentRunIntakeResponse["status"] {
  const value = record[propertyName];

  if (
    value !== "running" &&
    value !== "waiting_confirmation" &&
    value !== "completed" &&
    value !== "failed"
  ) {
    throw new TelegramBackendClientError(`${propertyName} is invalid.`);
  }

  return value;
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

function readConfirmationCallbackAction(
  record: Record<string, unknown>,
  propertyName: string,
): TelegramConfirmationCallbackResponse["action"] {
  const value = record[propertyName];

  if (value !== "confirm" && value !== "cancel") {
    throw new TelegramBackendClientError(`${propertyName} is invalid.`);
  }

  return value;
}

function readConfirmationCallbackStatus(
  record: Record<string, unknown>,
  propertyName: string,
): TelegramConfirmationCallbackResponse["status"] {
  const value = record[propertyName];

  if (value !== "confirmed" && value !== "cancelled") {
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
