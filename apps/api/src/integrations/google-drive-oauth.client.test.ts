import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleDriveAuthorizationUrl,
  GoogleDriveOAuthClient,
  GoogleDriveOAuthError,
  parseGoogleDriveAccessTokenGrant,
  parseGoogleDriveTokenGrant,
  parseGoogleDriveUserInfo,
} from "./google-drive-oauth.client.js";
import { IntegrationsConfigProvider, parseIntegrationsConfig } from "./integrations.config.js";
import { hasRequiredGoogleDriveScopes } from "./plugins/google-drive.integration-plugin.js";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://app.example.com/api/integrations/google-drive/callback",
};

test("Google Drive authorization requests offline access with narrow scopes and state", () => {
  const url = new URL(buildGoogleDriveAuthorizationUrl(config, "state-value"));

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("include_granted_scopes"), "true");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.match(url.searchParams.get("scope") ?? "", /drive\.file/u);
  assert.match(url.searchParams.get("scope") ?? "", /drive\.metadata\.readonly/u);
});

test("Google OAuth responses are runtime validated without exposing tokens", () => {
  assert.deepEqual(
    parseGoogleDriveTokenGrant({
      access_token: "access",
      expires_in: 3_600,
      refresh_token: "refresh",
      scope: "openid email",
    }),
    {
      accessToken: "access",
      expiresInSeconds: 3_600,
      refreshToken: "refresh",
      scopes: ["openid", "email"],
    },
  );
  assert.deepEqual(parseGoogleDriveUserInfo({ email: "owner@example.com", sub: "account-1" }), {
    accountId: "account-1",
    email: "owner@example.com",
  });
  assert.throws(
    () => parseGoogleDriveTokenGrant({ access_token: "access" }),
    GoogleDriveOAuthError,
  );
});

test("Google refresh grants require a short-lived access token", () => {
  assert.deepEqual(
    parseGoogleDriveAccessTokenGrant({
      access_token: "picker-access",
      expires_in: 3_600,
      scope: "https://www.googleapis.com/auth/drive.file",
    }),
    {
      accessToken: "picker-access",
      expiresInSeconds: 3_600,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    },
  );
  assert.throws(
    () => parseGoogleDriveAccessTokenGrant({ access_token: "picker-access" }),
    GoogleDriveOAuthError,
  );
});

test("Google Drive external-file synchronization requires both data scopes", () => {
  assert.equal(
    hasRequiredGoogleDriveScopes([
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]),
    true,
  );
  assert.equal(hasRequiredGoogleDriveScopes(["https://www.googleapis.com/auth/drive.file"]), false);
});

test("only an invalid refresh grant requires reauthorization, without leaking Google responses", async (context) => {
  const provider = new IntegrationsConfigProvider();
  context.mock.method(provider, "getConfig", () =>
    parseIntegrationsConfig({
      GOOGLE_DRIVE_CLIENT_ID: config.clientId,
      GOOGLE_DRIVE_CLIENT_SECRET: config.clientSecret,
      GOOGLE_DRIVE_REDIRECT_URI: config.redirectUri,
    }),
  );
  const client = new GoogleDriveOAuthClient(provider);
  for (const [status, error, requiresReauthorization] of [
    [400, "invalid_grant", true],
    [400, "invalid_client", false],
    [503, "temporarily_unavailable", false],
  ] as const) {
    context.mock.method(globalThis, "fetch", async () =>
      Response.json({ error, error_description: "sensitive-provider-detail" }, { status }),
    );
    await assert.rejects(client.refreshAccessToken("private-refresh-token"), (failure: unknown) => {
      assert.ok(failure instanceof GoogleDriveOAuthError);
      assert.equal(failure.requiresReauthorization, requiresReauthorization);
      assert.doesNotMatch(failure.message, /sensitive-provider-detail|private-refresh-token/u);
      return true;
    });
  }
});
