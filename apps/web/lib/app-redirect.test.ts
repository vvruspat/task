import assert from "node:assert/strict";
import test from "node:test";
import { createAppRedirect } from "./app-redirect.ts";

test("OAuth redirects retain the browser's public origin behind a container proxy", () => {
  const publicCallback = "https://task.example.com/api/integrations/google-drive/callback";
  for (const provider of ["googleDrive", "yandexDisk"]) {
    for (const status of ["connected", "error"]) {
      const response = createAppRedirect(`/settings/integrations?${provider}=${status}`);
      const location = response.headers.get("location");
      assert.ok(location);
      assert.equal(response.status, 303);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(
        new URL(location, publicCallback).toString(),
        `https://task.example.com/settings/integrations?${provider}=${status}`,
      );
      assert.doesNotMatch(location, /0\.0\.0\.0|localhost|https?:/u);
    }
  }
});

test("expired callback sessions return to the public login page", () => {
  const response = createAppRedirect("/login");
  assert.equal(response.headers.get("location"), "/login");
});

test("application redirects reject external destinations and header injection", () => {
  for (const destination of [
    "https://other.example/",
    "//other.example/",
    "/\\other.example/",
    "/settings\r\nlocation: https://other.example/",
  ]) {
    assert.throws(() => createAppRedirect(destination), /application-relative/u);
  }
});
