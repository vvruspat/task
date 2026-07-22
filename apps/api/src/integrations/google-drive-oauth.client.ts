import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { GoogleDriveOAuthConfig } from "./integrations.config.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";
import { googleDriveOAuthScopes } from "./plugins/google-drive.integration-plugin.js";

const authorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const userInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

export type GoogleDriveTokenGrant = {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  scopes: string[];
};

export type GoogleDriveAccessTokenGrant = {
  accessToken: string;
  expiresInSeconds: number;
  scopes: string[];
};

export type GoogleDriveUserInfo = {
  accountId: string;
  email: string | null;
};

export class GoogleDriveOAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleDriveOAuthError";
  }
}

@Injectable()
export class GoogleDriveOAuthClient {
  constructor(private readonly configProvider: IntegrationsConfigProvider) {}

  createAuthorizationUrl(state: string): string {
    return buildGoogleDriveAuthorizationUrl(this.getConfig(), state);
  }

  async exchangeCode(code: string): Promise<GoogleDriveTokenGrant> {
    const config = this.getConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    });
    const response = await requestGoogle(tokenEndpoint, {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveOAuthError("Google rejected the authorization code.");
    return parseGoogleDriveTokenGrant(payload);
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleDriveAccessTokenGrant> {
    const config = this.getConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
    const response = await requestGoogle(tokenEndpoint, {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveOAuthError("Google rejected the refresh token.");
    return parseGoogleDriveAccessTokenGrant(payload);
  }

  async readUserInfo(accessToken: string): Promise<GoogleDriveUserInfo> {
    const response = await requestGoogle(userInfoEndpoint, {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new GoogleDriveOAuthError("Google user information is unavailable.");
    return parseGoogleDriveUserInfo(payload);
  }

  private getConfig(): GoogleDriveOAuthConfig {
    const config = this.configProvider.getConfig().googleDrive;
    if (config === null) {
      throw new ServiceUnavailableException("Google Drive OAuth is not configured.");
    }
    return config;
  }
}

export function buildGoogleDriveAuthorizationUrl(
  config: GoogleDriveOAuthConfig,
  state: string,
): string {
  const url = new URL(authorizationEndpoint);
  url.search = new URLSearchParams({
    access_type: "offline",
    client_id: config.clientId,
    include_granted_scopes: "true",
    prompt: "consent",
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: googleDriveOAuthScopes.join(" "),
    state,
  }).toString();
  return url.toString();
}

export function parseGoogleDriveTokenGrant(value: unknown): GoogleDriveTokenGrant {
  if (!isRecord(value)) throw new GoogleDriveOAuthError("Google returned a malformed token grant.");
  const accessToken = value["access_token"];
  const expiresIn = value["expires_in"];
  const refreshToken = value["refresh_token"];
  const scope = value["scope"];
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    typeof refreshToken !== "string" ||
    refreshToken.length === 0 ||
    (scope !== undefined && typeof scope !== "string")
  ) {
    throw new GoogleDriveOAuthError("Google returned a malformed token grant.");
  }
  return {
    accessToken,
    expiresInSeconds: expiresIn,
    refreshToken,
    scopes: scope === undefined ? [...googleDriveOAuthScopes] : scope.split(" ").filter(Boolean),
  };
}

export function parseGoogleDriveAccessTokenGrant(value: unknown): GoogleDriveAccessTokenGrant {
  if (!isRecord(value)) throw new GoogleDriveOAuthError("Google returned a malformed token grant.");
  const accessToken = value["access_token"];
  const expiresIn = value["expires_in"];
  const scope = value["scope"];
  if (
    typeof accessToken !== "string" ||
    accessToken.length === 0 ||
    typeof expiresIn !== "number" ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0 ||
    (scope !== undefined && typeof scope !== "string")
  ) {
    throw new GoogleDriveOAuthError("Google returned a malformed token grant.");
  }
  return {
    accessToken,
    expiresInSeconds: expiresIn,
    scopes: scope === undefined ? [...googleDriveOAuthScopes] : scope.split(" ").filter(Boolean),
  };
}

export function parseGoogleDriveUserInfo(value: unknown): GoogleDriveUserInfo {
  if (!isRecord(value)) throw new GoogleDriveOAuthError("Google returned malformed user data.");
  const accountId = value["sub"];
  const email = value["email"];
  if (
    typeof accountId !== "string" ||
    accountId.length === 0 ||
    (email !== undefined && typeof email !== "string")
  ) {
    throw new GoogleDriveOAuthError("Google returned malformed user data.");
  }
  return { accountId, email: email ?? null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestGoogle(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new GoogleDriveOAuthError("Google OAuth service is unavailable.");
  }
}
