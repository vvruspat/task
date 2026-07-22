import assert from "node:assert/strict";
import test from "node:test";
import type { GoogleDriveFile, GoogleDriveFileSearchResult } from "./google-drive.client.js";
import {
  GoogleDriveAgentToolProvider,
  googleDriveAgentToolDefinitions,
} from "./google-drive-agent-tools.js";

const file: GoogleDriveFile = {
  appProperties: {},
  id: "drive_file_12345",
  mimeType: "application/pdf",
  modifiedAt: "2026-07-22T12:00:00.000Z",
  name: "Creative brief.pdf",
  parentId: "folder_12345",
  version: "7",
  webViewLink: "https://drive.google.com/file/d/drive_file_12345/view",
};

test("Google Drive agent tools expose read-only schemas and validated metadata", async () => {
  const searches: Array<{ limit: number; query: string }> = [];
  const provider = new GoogleDriveAgentToolProvider(
    {
      async getAccessGrant(): Promise<{
        accessToken: string;
        connectionId: string;
        expiresInSeconds: number;
      }> {
        return {
          accessToken: "access-token",
          connectionId: "connection-id",
          expiresInSeconds: 3_600,
        };
      },
    },
    {
      async getFile(): Promise<GoogleDriveFile> {
        return file;
      },
      async searchFiles(
        _accessToken: string,
        input: { limit: number; query: string },
      ): Promise<GoogleDriveFileSearchResult> {
        searches.push(input);
        return { files: [file], incomplete: false };
      },
    },
  );
  const context = {
    installationId: "installation-id",
    pluginKey: "google-drive",
    pluginVersion: "0.1.0",
    userId: "user-id",
    workspaceId: "workspace-id",
  };

  assert.deepEqual(
    googleDriveAgentToolDefinitions.map((tool) => [tool.name, tool.readOnly]),
    [
      ["search", true],
      ["get", true],
    ],
  );
  assert.deepEqual(
    await provider.execute({ arguments: { query: "  brief ", limit: 5 }, name: "search" }, context),
    {
      files: [
        {
          fileId: file.id,
          mimeType: file.mimeType,
          modifiedAt: file.modifiedAt,
          name: file.name,
          parentId: file.parentId,
          version: file.version,
          webUrl: file.webViewLink,
        },
      ],
      incomplete: false,
      kind: "google_drive_search_results",
      query: "brief",
    },
  );
  assert.deepEqual(searches, [{ limit: 5, query: "brief" }]);
  await assert.rejects(
    provider.execute({ arguments: { fileId: "bad" }, name: "get" }, context),
    /file ID is invalid/u,
  );
});
