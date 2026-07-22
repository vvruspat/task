export type TelegramBotEnvironment = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_USERNAME?: string;
  TASK_API_BOT_SHARED_SECRET?: string;
  TASK_API_BASE_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_PORT?: string;
};

export type TelegramBotConfig = {
  botToken: string;
  botUsername: string | null;
  backendBotSharedSecret: string;
  backendBaseUrl: string;
  webhookSecret: string | null;
  port: number;
};

export class InvalidTelegramBotEnvironmentError extends Error {
  constructor(
    variableName: keyof TelegramBotEnvironment,
    value: string | undefined,
    message: string,
  ) {
    super(
      `Invalid ${variableName}: ${message}. Received "${formatInvalidValue(variableName, value)}".`,
    );
    this.name = "InvalidTelegramBotEnvironmentError";
  }
}

export function parseTelegramBotConfig(environment: TelegramBotEnvironment): TelegramBotConfig {
  return {
    botToken: parseRequiredSecret("TELEGRAM_BOT_TOKEN", environment.TELEGRAM_BOT_TOKEN),
    botUsername: parseBotUsername(environment.TELEGRAM_BOT_USERNAME),
    backendBotSharedSecret: parseRequiredSecret(
      "TASK_API_BOT_SHARED_SECRET",
      environment.TASK_API_BOT_SHARED_SECRET,
    ),
    backendBaseUrl: parseBackendBaseUrl(environment.TASK_API_BASE_URL),
    webhookSecret: parseOptionalSecret(
      "TELEGRAM_WEBHOOK_SECRET",
      environment.TELEGRAM_WEBHOOK_SECRET,
    ),
    port: parsePort(environment.TELEGRAM_BOT_PORT),
  };
}

function parseBotUsername(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!/^[A-Za-z0-9_]{5,32}$/u.test(value)) {
    throw new InvalidTelegramBotEnvironmentError(
      "TELEGRAM_BOT_USERNAME",
      value,
      "must be a Telegram username without @",
    );
  }
  return value;
}

export function loadTelegramBotConfig(
  environment: TelegramBotEnvironment = process.env,
): TelegramBotConfig {
  return parseTelegramBotConfig(environment);
}

function parseRequiredSecret(
  variableName: "TELEGRAM_BOT_TOKEN" | "TASK_API_BOT_SHARED_SECRET",
  value: string | undefined,
): string {
  if (value === undefined) {
    throw new InvalidTelegramBotEnvironmentError(variableName, value, "must be set");
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidTelegramBotEnvironmentError(variableName, value, "must not be empty");
  }

  return value;
}

function parseOptionalSecret(
  variableName: "TELEGRAM_WEBHOOK_SECRET",
  value: string | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidTelegramBotEnvironmentError(variableName, value, "must not be empty");
  }

  return value;
}

function parseBackendBaseUrl(value: string | undefined): string {
  if (value === undefined) {
    throw new InvalidTelegramBotEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidTelegramBotEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidTelegramBotEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must be an HTTP or HTTPS URL",
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidTelegramBotEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must use http:// or https://",
    );
  }

  if (url.hostname.length === 0) {
    throw new InvalidTelegramBotEnvironmentError(
      "TASK_API_BASE_URL",
      value,
      "must include a hostname",
    );
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3001;
  }

  if (!portPattern.test(value)) {
    throw new InvalidTelegramBotEnvironmentError(
      "TELEGRAM_BOT_PORT",
      value,
      "must be an integer between 1 and 65535",
    );
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > maxPort) {
    throw new InvalidTelegramBotEnvironmentError(
      "TELEGRAM_BOT_PORT",
      value,
      "must be an integer between 1 and 65535",
    );
  }

  return port;
}

function formatInvalidValue(
  variableName: keyof TelegramBotEnvironment,
  value: string | undefined,
): string {
  if (value === undefined) {
    return "undefined";
  }

  if (
    variableName === "TELEGRAM_BOT_TOKEN" ||
    variableName === "TASK_API_BOT_SHARED_SECRET" ||
    variableName === "TELEGRAM_WEBHOOK_SECRET"
  ) {
    return "[redacted]";
  }

  if (variableName === "TASK_API_BASE_URL") {
    return "[redacted]";
  }

  return value;
}

const maxPort = 65535;
const portPattern = /^\d+$/;
