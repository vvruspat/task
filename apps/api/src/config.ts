export type ApiEnvironment = {
  PORT?: string;
};

export type ApiConfig = {
  port: number;
};

export class InvalidApiEnvironmentError extends Error {
  constructor(variableName: keyof ApiEnvironment, value: string, message: string) {
    super(`Invalid ${variableName}: ${message}. Received "${value}".`);
    this.name = "InvalidApiEnvironmentError";
  }
}

const defaultPort = 3000;
const maxPort = 65_535;
const portPattern = /^\d+$/;

export function parseApiConfig(environment: ApiEnvironment): ApiConfig {
  return {
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
