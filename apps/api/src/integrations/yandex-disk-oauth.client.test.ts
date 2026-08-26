import assert from "node:assert/strict";
import test from "node:test";
import { hasRequiredYandexDiskScopes } from "./plugins/yandex-disk.integration-plugin.js";
import {
  buildYandexDiskAuthorizationUrl,
  parseYandexDiskAccessTokenGrant,
  parseYandexDiskTokenGrant,
  parseYandexDiskUserInfo,
  YandexDiskOAuthError,
} from "./yandex-disk-oauth.client.js";

const config = {
  clientId: "client-id",
  clientSecret: "client-secret",
  redirectUri: "https://app.example.com/api/integrations/yandex-disk/callback",
};

test("Yandex Disk authorization requests bounded data scopes and state", () => {
  const url = new URL(buildYandexDiskAuthorizationUrl(config, "state-value"));
  assert.equal(url.origin, "https://oauth.yandex.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(
    url.searchParams.get("scope"),
    "cloud_api:disk.read,cloud_api:disk.write,cloud_api:disk.info",
  );
});

test("Yandex OAuth and Disk user responses are runtime validated", () => {
  assert.deepEqual(
    parseYandexDiskTokenGrant({
      access_token: "access",
      expires_in: 3_600,
      refresh_token: "refresh",
      scope: "cloud_api:disk.read cloud_api:disk.write cloud_api:disk.info",
    }),
    {
      accessToken: "access",
      expiresInSeconds: 3_600,
      refreshToken: "refresh",
      scopes: ["cloud_api:disk.read", "cloud_api:disk.write", "cloud_api:disk.info"],
    },
  );
  assert.deepEqual(parseYandexDiskUserInfo({ user: { display_name: "Owner", uid: "42" } }), {
    accountId: "42",
    displayName: "Owner",
  });
  assert.throws(() => parseYandexDiskTokenGrant({ access_token: "access" }), YandexDiskOAuthError);
});

test("Yandex refresh grants and required scopes are validated", () => {
  assert.deepEqual(
    parseYandexDiskAccessTokenGrant({
      access_token: "access",
      expires_in: 3_600,
      refresh_token: "next-refresh",
      scope: "cloud_api:disk.read,cloud_api:disk.write,cloud_api:disk.info",
    }),
    {
      accessToken: "access",
      expiresInSeconds: 3_600,
      refreshToken: "next-refresh",
      scopes: ["cloud_api:disk.read", "cloud_api:disk.write", "cloud_api:disk.info"],
    },
  );
  assert.equal(
    hasRequiredYandexDiskScopes([
      "cloud_api:disk.read",
      "cloud_api:disk.write",
      "cloud_api:disk.info",
    ]),
    true,
  );
  assert.equal(hasRequiredYandexDiskScopes(["cloud_api:disk.read"]), false);
});
