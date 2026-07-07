import type { TelegramReplyAction } from "./message-handler.js";

export type TelegramBotApiPostHeaders = {
  accept: string;
  "content-type": string;
};

export type TelegramBotApiFetchInit = {
  method: "POST";
  headers: TelegramBotApiPostHeaders;
  body: string;
};

export type TelegramBotApiFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
};

export type TelegramBotApiFetch = (
  input: string,
  init: TelegramBotApiFetchInit,
) => Promise<TelegramBotApiFetchResponse>;

export type TelegramReplySenderOptions = {
  botToken: string;
  apiBaseUrl?: string;
  fetch?: TelegramBotApiFetch;
};

export type TelegramReplySender = {
  sendReply(action: TelegramReplyAction): Promise<TelegramSendMessageResult>;
};

export type TelegramSendMessageResult = {
  messageId: string;
};

type TelegramSendMessageBody = {
  chat_id: string;
  text: string;
  reply_parameters?: {
    message_id: number;
    allow_sending_without_reply: true;
  };
};

export class TelegramReplySenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramReplySenderError";
  }
}

export function createTelegramReplySender(
  options: TelegramReplySenderOptions,
): TelegramReplySender {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? "https://api.telegram.org");
  const fetchImplementation = options.fetch ?? globalThis.fetch;

  return {
    async sendReply(action: TelegramReplyAction) {
      return sendMessage(
        fetchImplementation,
        `${apiBaseUrl}/bot${options.botToken}/sendMessage`,
        createSendMessageBody(action),
      );
    },
  };
}

async function sendMessage(
  fetchImplementation: TelegramBotApiFetch,
  url: string,
  body: TelegramSendMessageBody,
): Promise<TelegramSendMessageResult> {
  const response = await fetchImplementation(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new TelegramReplySenderError(
      `Telegram sendMessage failed with ${response.status} ${response.statusText}.`,
    );
  }

  return readSendMessageResponse(await response.json());
}

function createSendMessageBody(action: TelegramReplyAction): TelegramSendMessageBody {
  if (action.telegramChatId === null) {
    throw new TelegramReplySenderError("Telegram chat id is required to send a reply.");
  }

  const body: TelegramSendMessageBody = {
    chat_id: action.telegramChatId,
    text: action.text,
  };

  if (action.replyToMessageId !== null) {
    body.reply_parameters = {
      message_id: readMessageId(action.replyToMessageId),
      allow_sending_without_reply: true,
    };
  }

  return body;
}

function readSendMessageResponse(value: unknown): TelegramSendMessageResult {
  const record = readRecord(value, "Telegram sendMessage response");
  const ok = readProperty(record, "ok");

  if (ok !== true) {
    throw new TelegramReplySenderError("Telegram sendMessage response was not successful.");
  }

  const result = readRecord(readProperty(record, "result"), "Telegram sendMessage result");

  return {
    messageId: readTelegramIntegerAsString(result, "message_id"),
  };
}

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
}

function readMessageId(value: string): number {
  if (!telegramMessageIdPattern.test(value)) {
    throw new TelegramReplySenderError("Telegram reply message id must be an integer string.");
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new TelegramReplySenderError("Telegram reply message id is outside the safe range.");
  }

  return parsed;
}

function readTelegramIntegerAsString(
  record: Record<string, unknown>,
  propertyName: string,
): string {
  const value = record[propertyName];

  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new TelegramReplySenderError(`${propertyName} must be a safe integer.`);
  }

  return value.toString();
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new TelegramReplySenderError(`${label} must be an object.`);
  }

  return value;
}

function readProperty(record: Record<string, unknown>, propertyName: string): unknown {
  return record[propertyName];
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const telegramMessageIdPattern = /^[1-9]\d*$/;
