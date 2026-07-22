import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidGoogleDriveWebhookError,
  parseGoogleDriveWebhookHeaders,
  safeGoogleDriveWebhookHeaders,
} from "./google-drive-webhook.contracts.js";

const token = "a".repeat(43);

test("Google Drive webhook headers are validated and the secret token is excluded from audit data", () => {
  const notification = parseGoogleDriveWebhookHeaders({
    "x-goog-channel-expiration": "Tue, 28 Jul 2026 12:00:00 GMT",
    "x-goog-channel-id": "7638bc4e-46b4-4e7b-8d73-98b1ad67f248",
    "x-goog-channel-token": token,
    "x-goog-changed": "children",
    "x-goog-message-number": "42",
    "x-goog-resource-id": "resource-id",
    "x-goog-resource-state": "change",
    "x-goog-resource-uri": "https://www.googleapis.com/drive/v3/changes",
  });

  assert.equal(notification.channelToken, token);
  assert.deepEqual(safeGoogleDriveWebhookHeaders(notification), {
    channelId: "7638bc4e-46b4-4e7b-8d73-98b1ad67f248",
    changed: "children",
    expiration: "Tue, 28 Jul 2026 12:00:00 GMT",
    messageNumber: "42",
    resourceId: "resource-id",
    resourceState: "change",
    resourceUri: "https://www.googleapis.com/drive/v3/changes",
  });
});

test("Google Drive webhook headers reject missing or malformed authentication data", () => {
  assert.throws(
    () =>
      parseGoogleDriveWebhookHeaders({
        "x-goog-channel-id": "channel",
        "x-goog-channel-token": "not-a-token",
        "x-goog-message-number": "one",
        "x-goog-resource-id": "resource-id",
        "x-goog-resource-state": "change",
        "x-goog-resource-uri": "http://example.test/changes",
      }),
    InvalidGoogleDriveWebhookError,
  );
});
