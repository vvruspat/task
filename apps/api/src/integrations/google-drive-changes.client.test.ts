import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveApiError } from "./google-drive.client.js";
import {
  GoogleDriveChangesClient,
  parseGoogleDriveChangeChannel,
  parseGoogleDriveChangePage,
  parseGoogleDriveStartPageToken,
} from "./google-drive-changes.client.js";

test("Google Drive change cursors and channels are runtime validated", () => {
  assert.equal(parseGoogleDriveStartPageToken({ startPageToken: "cursor-1" }), "cursor-1");
  assert.deepEqual(
    parseGoogleDriveChangeChannel({
      expiration: "1784822400000",
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      resourceId: "opaque-resource-id",
      resourceUri: "https://www.googleapis.com/drive/v3/changes",
    }),
    {
      expiration: new Date(1_784_822_400_000),
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      resourceId: "opaque-resource-id",
      resourceUri: "https://www.googleapis.com/drive/v3/changes",
    },
  );
  assert.throws(() => parseGoogleDriveStartPageToken({}), GoogleDriveApiError);
  assert.throws(
    () =>
      parseGoogleDriveChangeChannel({
        expiration: "invalid",
        id: "channel",
        resourceId: "resource",
        resourceUri: "javascript:alert(1)",
      }),
    GoogleDriveApiError,
  );
});

test("Google Drive change pages retain file identity and cursors", () => {
  assert.deepEqual(
    parseGoogleDriveChangePage({
      changes: [
        {
          file: {
            id: "file-id",
            mimeType: "application/pdf",
            modifiedTime: "2026-07-22T12:00:00.000Z",
            name: "brief.pdf",
            parents: ["folder-id"],
            trashed: false,
            version: "7",
            webViewLink: "https://drive.google.com/file/d/file-id/view",
          },
          fileId: "file-id",
          removed: false,
          time: "2026-07-22T12:00:01.000Z",
        },
      ],
      newStartPageToken: "cursor-2",
    }),
    {
      changes: [
        {
          file: {
            id: "file-id",
            mimeType: "application/pdf",
            modifiedAt: "2026-07-22T12:00:00.000Z",
            name: "brief.pdf",
            parentId: "folder-id",
            trashed: false,
            version: "7",
            webViewLink: "https://drive.google.com/file/d/file-id/view",
          },
          fileId: "file-id",
          removed: false,
          time: "2026-07-22T12:00:01.000Z",
        },
      ],
      newStartPageToken: "cursor-2",
      nextPageToken: null,
    },
  );
});

test("Google Drive changes client sends a tokenized expiring watch request", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  let requestUrl = "";
  let requestBody = "";
  globalThis.fetch = async (input, init) => {
    requestUrl = input instanceof Request ? input.url : input.toString();
    requestBody = typeof init?.body === "string" ? init.body : "";
    return Response.json({
      expiration: "1784822400000",
      id: "aaaaaaaa-0000-4000-8000-000000000001",
      resourceId: "opaque-resource-id",
      resourceUri: "https://www.googleapis.com/drive/v3/changes",
    });
  };

  await new GoogleDriveChangesClient().watchChanges("access-token", {
    callbackUrl: "https://task.example.com/api/integrations/webhooks/google-drive",
    channelId: "aaaaaaaa-0000-4000-8000-000000000001",
    channelToken: "callback-token",
    expiresAt: new Date(1_784_822_400_000),
    pageToken: "cursor-1",
  });

  assert.match(requestUrl, /changes\/watch/u);
  assert.match(requestUrl, /pageToken=cursor-1/u);
  assert.match(requestBody, /callback-token/u);
  assert.match(requestBody, /https:\/\/task\.example\.com/u);
});
