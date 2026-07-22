import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleDriveAuthorizationUrl,
  GoogleDriveOAuthError,
  parseGoogleDriveAccessTokenGrant,
  parseGoogleDriveTokenGrant,
  parseGoogleDriveUserInfo,
} from "./google-drive-oauth.client.js";

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
