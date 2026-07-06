export type ApiEnvironment = {
  DATABASE_URL?: string;
  PORT?: string;
};

export type ApiDatabaseConfig = {
  url: string;
};

export type ApiConfig = {
  database: ApiDatabaseConfig | null;
  port: number;
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
    database: parseDatabaseConfig(environment.DATABASE_URL),
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

function formatInvalidValue(variableName: keyof ApiEnvironment, value: string): string {
  if (variableName === "DATABASE_URL") {
    return "[redacted]";
  }

  return value;
}
