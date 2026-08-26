import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { YandexDiskOAuthConfig } from "./integrations.config.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";
import { yandexDiskRequiredDataScopes } from "./plugins/yandex-disk.integration-plugin.js";

const authorizationEndpoint = "https://oauth.yandex.com/authorize";
const tokenEndpoint = "https://oauth.yandex.com/token";
const diskEndpoint = "https://cloud-api.yandex.net/v1/disk";

export type YandexDiskTokenGrant = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  scopes: string[];
};

export type YandexDiskAccessTokenGrant = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  scopes: string[];
};

export type YandexDiskUserInfo = {
  accountId: string;
  displayName: string | null;
};

export class YandexDiskOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YandexDiskOAuthError";
  }
}

@Injectable()
export class YandexDiskOAuthClient {
  constructor(private readonly configProvider: IntegrationsConfigProvider) {}

  createAuthorizationUrl(state: string): string {
    return buildYandexDiskAuthorizationUrl(this.getConfig(), state);
  }

  async exchangeCode(code: string): Promise<YandexDiskTokenGrant> {
    const config = this.getConfig();
    const response = await requestYandex(tokenEndpoint, {
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new YandexDiskOAuthError("Yandex rejected the authorization code.");
    return parseYandexDiskTokenGrant(payload);
  }

  async refreshAccessToken(refreshToken: string): Promise<YandexDiskAccessTokenGrant> {
    const config = this.getConfig();
    const response = await requestYandex(tokenEndpoint, {
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new YandexDiskOAuthError("Yandex rejected the refresh token.");
    return parseYandexDiskAccessTokenGrant(payload);
  }

  async readUserInfo(accessToken: string): Promise<YandexDiskUserInfo> {
    const response = await requestYandex(diskEndpoint, {
      headers: { authorization: `OAuth ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok)
      throw new YandexDiskOAuthError("Yandex Disk user information is unavailable.");
    return parseYandexDiskUserInfo(payload);
  }

  private getConfig(): YandexDiskOAuthConfig {
    const config = this.configProvider.getConfig().yandexDisk;
    if (config === null)
      throw new ServiceUnavailableException("Yandex Disk OAuth is not configured.");
    return config;
  }
}

export function buildYandexDiskAuthorizationUrl(
  config: YandexDiskOAuthConfig,
  state: string,
): string {
  const url = new URL(authorizationEndpoint);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    force_confirm: "yes",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: yandexDiskRequiredDataScopes.join(","),
    state,
  }).toString();
  return url.toString();
}

export function parseYandexDiskTokenGrant(value: unknown): YandexDiskTokenGrant {
  if (!isRecord(value)) throw malformedTokenGrant();
  const accessToken = value["access_token"];
  const expiresIn = value["expires_in"];
  const refreshToken = value["refresh_token"];
  const scope = value["scope"];
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    !isPositiveNumber(expiresIn) ||
    typeof refreshToken !== "string" ||
    refreshToken.length === 0 ||
    (scope !== undefined && typeof scope !== "string")
  ) {
    throw malformedTokenGrant();
  }
  return {
    accessToken,
    expiresInSeconds: expiresIn,
    refreshToken,
    scopes: parseScopes(scope),
  };
}

export function parseYandexDiskAccessTokenGrant(value: unknown): YandexDiskAccessTokenGrant {
  if (!isRecord(value)) throw malformedTokenGrant();
  const accessToken = value["access_token"];
  const expiresIn = value["expires_in"];
  const refreshToken = value["refresh_token"];
  const scope = value["scope"];
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    !isPositiveNumber(expiresIn) ||
    typeof refreshToken !== "string" ||
    refreshToken.length === 0 ||
    (scope !== undefined && typeof scope !== "string")
  ) {
    throw malformedTokenGrant();
  }
  return {
    accessToken,
    expiresInSeconds: expiresIn,
    refreshToken,
    scopes: parseScopes(scope),
  };
}

export function parseYandexDiskUserInfo(value: unknown): YandexDiskUserInfo {
  if (!isRecord(value) || !isRecord(value["user"])) {
    throw new YandexDiskOAuthError("Yandex Disk returned malformed user data.");
  }
  const uid = value["user"]["uid"];
  const displayName = value["user"]["display_name"];
  const login = value["user"]["login"];
  if (
    (typeof uid !== "string" && typeof uid !== "number") ||
    String(uid).length === 0 ||
    (displayName !== undefined && typeof displayName !== "string") ||
    (login !== undefined && typeof login !== "string")
  ) {
    throw new YandexDiskOAuthError("Yandex Disk returned malformed user data.");
  }
  const resolvedDisplayName = displayName ?? login ?? null;
  return { accountId: String(uid), displayName: resolvedDisplayName };
}

function parseScopes(value: string | undefined): string[] {
  return value === undefined
    ? [...yandexDiskRequiredDataScopes]
    : value.split(/[ ,]+/u).filter(Boolean);
}

function malformedTokenGrant(): YandexDiskOAuthError {
  return new YandexDiskOAuthError("Yandex returned a malformed token grant.");
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestYandex(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new YandexDiskOAuthError("Yandex OAuth service is unavailable.");
  }
}
