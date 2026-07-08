export type ApiEnvironment = {
  DATABASE_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  PORT?: string;
  TELEGRAM_BOT_SHARED_SECRET?: string;
};

export type ApiDatabaseConfig = {
  url: string;
};

export type ApiConfig = {
  botAuth: ApiBotAuthConfig | null;
  database: ApiDatabaseConfig | null;
  openRouter: ApiOpenRouterConfig | null;
  port: number;
};

export type ApiBotAuthConfig = {
  sharedSecret: string;
};

export type ApiOpenRouterConfig = {
  apiKey: string;
  model: string;
};

export class InvalidApiEnvironmentError extends Error {
  constructor(variableName: keyof ApiEnvironment, value: string, message: string) {
    super(
      `Invalid ${variableName}: ${message}. Received "${formatInvalidValue(variableName, value)}".`,
    );
    this.name = "InvalidApiEnvironmentError";
  }
}

const defaultPort = 3000;
const maxPort = 65_535;
const portPattern = /^\d+$/;

export function parseApiConfig(environment: ApiEnvironment): ApiConfig {
  return {
    botAuth: parseBotAuthConfig(environment.TELEGRAM_BOT_SHARED_SECRET),
    database: parseDatabaseConfig(environment.DATABASE_URL),
    openRouter: parseOpenRouterConfig(environment.OPENROUTER_API_KEY, environment.OPENROUTER_MODEL),
    port: parsePort(environment.PORT),
  };
}

export function loadApiConfig(environment: ApiEnvironment = process.env): ApiConfig {
  return parseApiConfig(environment);
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return defaultPort;
  }

  if (!portPattern.test(value)) {
    throw new InvalidApiEnvironmentError("PORT", value, "must be an integer between 1 and 65535");
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > maxPort) {
    throw new InvalidApiEnvironmentError("PORT", value, "must be an integer between 1 and 65535");
  }

  return port;
}

function parseDatabaseConfig(value: string | undefined): ApiDatabaseConfig | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidApiEnvironmentError(
      "DATABASE_URL",
      value,
      "must be a PostgreSQL connection URL",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidApiEnvironmentError(
      "DATABASE_URL",
      value,
      "must be a PostgreSQL connection URL",
    );
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new InvalidApiEnvironmentError(
      "DATABASE_URL",
      value,
      "must use postgres:// or postgresql://",
    );
  }

  if (url.hostname.length === 0) {
    throw new InvalidApiEnvironmentError("DATABASE_URL", value, "must include a hostname");
  }

  if (url.username.length === 0) {
    throw new InvalidApiEnvironmentError("DATABASE_URL", value, "must include a username");
  }

  if (url.pathname === "" || url.pathname === "/") {
    throw new InvalidApiEnvironmentError("DATABASE_URL", value, "must include a database name");
  }

  return {
    url: value,
  };
}

function parseBotAuthConfig(value: string | undefined): ApiBotAuthConfig | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidApiEnvironmentError(
      "TELEGRAM_BOT_SHARED_SECRET",
      value,
      "must be a non-empty string without surrounding whitespace",
    );
  }

  return {
    sharedSecret: value,
  };
}

function parseOpenRouterConfig(
  apiKey: string | undefined,
  model: string | undefined,
): ApiOpenRouterConfig | null {
  if (apiKey === undefined && model === undefined) {
    return null;
  }

  if (apiKey === undefined) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_API_KEY",
      "",
      "must be configured when OPENROUTER_MODEL is set",
    );
  }

  if (model === undefined) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_MODEL",
      "",
      "must be configured when OPENROUTER_API_KEY is set",
    );
  }

  if (apiKey.trim() !== apiKey || apiKey.length === 0) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_API_KEY",
      apiKey,
      "must be a non-empty string without surrounding whitespace",
    );
  }

  if (model.trim() !== model || model.length === 0 || /\s/u.test(model)) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_MODEL",
      model,
      "must be a non-empty model identifier without whitespace",
    );
  }

  return {
    apiKey,
    model,
  };
}

function formatInvalidValue(variableName: keyof ApiEnvironment, value: string): string {
  if (
    variableName === "DATABASE_URL" ||
    variableName === "OPENROUTER_API_KEY" ||
    variableName === "TELEGRAM_BOT_SHARED_SECRET"
  ) {
    return "[redacted]";
  }

  return value;
}
