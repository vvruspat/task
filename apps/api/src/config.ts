export type ApiEnvironment = {
  BREVO_API_KEY?: string;
  BREVO_TEMPLATE_ID?: string;
  DATABASE_URL?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_APP_TITLE?: string;
  OPENROUTER_FALLBACK_MODEL?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  PORT?: string;
  TELEGRAM_BOT_SHARED_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  WEB_APP_URL?: string;
};

export type ApiDatabaseConfig = {
  url: string;
};

export type ApiConfig = {
  botAuth: ApiBotAuthConfig | null;
  database: ApiDatabaseConfig | null;
  email: ApiEmailConfig | null;
  openRouter: ApiOpenRouterConfig | null;
  port: number;
  telegramMiniApp: ApiTelegramMiniAppConfig | null;
};

export type ApiEmailConfig = {
  apiKey: string;
  templateId: number;
  webAppUrl: string;
};

export type ApiBotAuthConfig = {
  sharedSecret: string;
};

export type ApiTelegramMiniAppConfig = {
  botToken: string;
};

export type ApiOpenRouterConfig = {
  apiKey: string;
  appTitle: string;
  fallbackModel: string | null;
  model: string;
  siteUrl: string | null;
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
const defaultOpenRouterAppTitle = "tAsk";
const maxPort = 65_535;
const portPattern = /^\d+$/;

export function parseApiConfig(environment: ApiEnvironment): ApiConfig {
  return {
    botAuth: parseBotAuthConfig(environment.TELEGRAM_BOT_SHARED_SECRET),
    database: parseDatabaseConfig(environment.DATABASE_URL),
    email: parseEmailConfig(environment),
    openRouter: parseOpenRouterConfig(environment),
    port: parsePort(environment.PORT),
    telegramMiniApp: parseTelegramMiniAppConfig(environment.TELEGRAM_BOT_TOKEN),
  };
}

function parseEmailConfig(environment: ApiEnvironment): ApiEmailConfig | null {
  const apiKey = environment.BREVO_API_KEY;
  const templateId = environment.BREVO_TEMPLATE_ID;
  const webAppUrl = environment.WEB_APP_URL;

  if (apiKey === undefined && templateId === undefined && webAppUrl === undefined) {
    return null;
  }

  if (apiKey === undefined || !isTrimmedNonEmpty(apiKey)) {
    throw new InvalidApiEnvironmentError(
      "BREVO_API_KEY",
      apiKey ?? "",
      "must be configured for email invitations",
    );
  }
  if (templateId === undefined || !/^\d+$/u.test(templateId) || Number(templateId) <= 0) {
    throw new InvalidApiEnvironmentError(
      "BREVO_TEMPLATE_ID",
      templateId ?? "",
      "must be a positive integer for email invitations",
    );
  }
  if (webAppUrl === undefined) {
    throw new InvalidApiEnvironmentError(
      "WEB_APP_URL",
      "",
      "must be configured for email invitations",
    );
  }

  let parsedWebAppUrl: URL;
  try {
    parsedWebAppUrl = new URL(webAppUrl);
  } catch {
    throw new InvalidApiEnvironmentError("WEB_APP_URL", webAppUrl, "must be an absolute URL");
  }
  if (
    webAppUrl.trim() !== webAppUrl ||
    (parsedWebAppUrl.protocol !== "https:" &&
      !(parsedWebAppUrl.protocol === "http:" && isLoopbackHost(parsedWebAppUrl.hostname)))
  ) {
    throw new InvalidApiEnvironmentError(
      "WEB_APP_URL",
      webAppUrl,
      "must use HTTPS, or HTTP for a loopback host",
    );
  }

  return {
    apiKey,
    templateId: Number(templateId),
    webAppUrl: webAppUrl.replace(/\/$/u, ""),
  };
}

function isTrimmedNonEmpty(value: string): boolean {
  return value.length > 0 && value.trim() === value;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
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

function parseTelegramMiniAppConfig(value: string | undefined): ApiTelegramMiniAppConfig | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidApiEnvironmentError(
      "TELEGRAM_BOT_TOKEN",
      value,
      "must be a non-empty string without surrounding whitespace",
    );
  }

  return {
    botToken: value,
  };
}

function parseOpenRouterConfig(environment: ApiEnvironment): ApiOpenRouterConfig | null {
  const apiKey = environment.OPENROUTER_API_KEY;
  const appTitle = environment.OPENROUTER_APP_TITLE;
  const fallbackModel = environment.OPENROUTER_FALLBACK_MODEL;
  const model = environment.OPENROUTER_MODEL;
  const siteUrl = environment.OPENROUTER_SITE_URL;

  if (
    apiKey === undefined &&
    appTitle === undefined &&
    fallbackModel === undefined &&
    model === undefined &&
    siteUrl === undefined
  ) {
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
    appTitle: parseOptionalOpenRouterAppTitle(appTitle),
    fallbackModel: parseOptionalOpenRouterModel("OPENROUTER_FALLBACK_MODEL", fallbackModel),
    model,
    siteUrl: parseOptionalOpenRouterSiteUrl(siteUrl),
  };
}

function parseOptionalOpenRouterModel(
  variableName: "OPENROUTER_FALLBACK_MODEL",
  value: string | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0 || /\s/u.test(value)) {
    throw new InvalidApiEnvironmentError(
      variableName,
      value,
      "must be a non-empty model identifier without whitespace",
    );
  }

  return value;
}

function parseOptionalOpenRouterAppTitle(value: string | undefined): string {
  if (value === undefined) {
    return defaultOpenRouterAppTitle;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_APP_TITLE",
      value,
      "must be a non-empty string without surrounding whitespace",
    );
  }

  return value;
}

function parseOptionalOpenRouterSiteUrl(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  if (value.trim() !== value || value.length === 0) {
    throw new InvalidApiEnvironmentError(
      "OPENROUTER_SITE_URL",
      value,
      "must be an HTTPS URL without surrounding whitespace",
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new InvalidApiEnvironmentError("OPENROUTER_SITE_URL", value, "must be an HTTPS URL");
  }

  if (url.protocol !== "https:") {
    throw new InvalidApiEnvironmentError("OPENROUTER_SITE_URL", value, "must use https://");
  }

  return value;
}

function formatInvalidValue(variableName: keyof ApiEnvironment, value: string): string {
  if (
    variableName === "BREVO_API_KEY" ||
    variableName === "DATABASE_URL" ||
    variableName === "OPENROUTER_API_KEY" ||
    variableName === "TELEGRAM_BOT_TOKEN" ||
    variableName === "TELEGRAM_BOT_SHARED_SECRET"
  ) {
    return "[redacted]";
  }

  return value;
}
