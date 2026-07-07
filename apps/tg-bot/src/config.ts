export type TelegramBotEnvironment = {
  TELEGRAM_BOT_TOKEN?: string;
  TASK_API_BASE_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
};

export type TelegramBotConfig = {
  botToken: string;
  backendBaseUrl: string;
  webhookSecret: string | null;
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
    backendBaseUrl: parseBackendBaseUrl(environment.TASK_API_BASE_URL),
    webhookSecret: parseOptionalSecret(
      "TELEGRAM_WEBHOOK_SECRET",
      environment.TELEGRAM_WEBHOOK_SECRET,
    ),
  };
}

export function loadTelegramBotConfig(
  environment: TelegramBotEnvironment = process.env,
): TelegramBotConfig {
  return parseTelegramBotConfig(environment);
}

function parseRequiredSecret(
  variableName: "TELEGRAM_BOT_TOKEN",
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

function formatInvalidValue(
  variableName: keyof TelegramBotEnvironment,
  value: string | undefined,
): string {
  if (value === undefined) {
    return "undefined";
  }

  if (variableName === "TELEGRAM_BOT_TOKEN" || variableName === "TELEGRAM_WEBHOOK_SECRET") {
    return "[redacted]";
  }

  if (variableName === "TASK_API_BASE_URL") {
    return "[redacted]";
  }

  return value;
}
