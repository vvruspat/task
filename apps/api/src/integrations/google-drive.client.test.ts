import assert from "node:assert/strict";
import test from "node:test";
import {
  GoogleDriveApiError,
  GoogleDriveClient,
  googleDriveFolderMimeType,
  parseGeneratedGoogleDriveFileId,
  parseGoogleDriveFile,
  parseGoogleDriveFolder,
} from "./google-drive.client.js";

test("Google Drive folder metadata is runtime validated", () => {
  assert.deepEqual(
    parseGoogleDriveFolder({
      capabilities: { canAddChildren: true },
      id: "folder-id",
      mimeType: googleDriveFolderMimeType,
      modifiedTime: "2026-07-22T12:00:00.000Z",
      name: "tAsk workspace",
      parents: ["parent-id"],
      trashed: false,
      version: "42",
      webViewLink: "https://drive.google.com/drive/folders/folder-id",
    }),
    {
      id: "folder-id",
      mimeType: googleDriveFolderMimeType,
      modifiedAt: "2026-07-22T12:00:00.000Z",
      name: "tAsk workspace",
      parentId: "parent-id",
      version: "42",
      webViewLink: "https://drive.google.com/drive/folders/folder-id",
    },
  );
});

test("Google Drive file metadata is runtime validated", () => {
  assert.deepEqual(
    parseGoogleDriveFile({
      appProperties: { tAskAttachmentId: "attachment-id" },
      id: "file-id",
      mimeType: "application/pdf",
      modifiedTime: "2026-07-22T12:00:00.000Z",
      name: "brief.pdf",
      parents: ["folder-id"],
      trashed: false,
      version: "7",
      webViewLink: "https://drive.google.com/file/d/file-id/view",
    }),
    {
      appProperties: { tAskAttachmentId: "attachment-id" },
      id: "file-id",
      mimeType: "application/pdf",
      modifiedAt: "2026-07-22T12:00:00.000Z",
      name: "brief.pdf",
      parentId: "folder-id",
      version: "7",
      webViewLink: "https://drive.google.com/file/d/file-id/view",
    },
  );
  assert.throws(
    () => parseGoogleDriveFile({ id: "file-id", mimeType: "application/pdf", name: "x" }),
    GoogleDriveApiError,
  );
});

test("Google Drive file upload treats a pre-generated ID conflict as an idempotent retry", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const requests: Array<{ body: RequestInit["body"]; method: string }> = [];
  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    requests.push({ body: init?.body, method });
    if (method === "POST") return new Response(null, { status: 409 });
    return Response.json({
      appProperties: { tAskAttachmentId: "attachment-id" },
      id: "generated_file_123",
      mimeType: "text/plain",
      name: "note.txt",
      parents: ["task_folder_123"],
      trashed: false,
      webViewLink: "https://drive.google.com/file/d/generated_file_123/view",
    });
  };

  const file = await new GoogleDriveClient().uploadFile("access-token", {
    appProperties: { tAskAttachmentId: "attachment-id" },
    bytes: new TextEncoder().encode("hello"),
    fileId: "generated_file_123",
    mimeType: "text/plain",
    name: "note.txt",
    parentId: "task_folder_123",
  });

  assert.equal(file.id, "generated_file_123");
  assert.deepEqual(
    requests.map((request) => request.method),
    ["POST", "GET"],
  );
  const uploadBody = requests[0]?.body;
  assert.ok(uploadBody instanceof Blob);
  assert.match(await uploadBody.text(), /hello/u);
});

test("Google Drive folder creation treats a pre-generated ID conflict as an idempotent retry", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const requests: Array<{ method: string; url: string }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    requests.push({ method, url });
    if (method === "POST") return new Response(null, { status: 409 });
    return Response.json({
      capabilities: { canAddChildren: true },
      id: "generated_folder_123",
      mimeType: googleDriveFolderMimeType,
      name: "TASK-42 Folder",
      parents: ["root_folder_123"],
      trashed: false,
      webViewLink: "https://drive.google.com/drive/folders/generated_folder_123",
    });
  };
  globalThis.fetch = fakeFetch;

  const folder = await new GoogleDriveClient().createFolder("access-token", {
    appProperties: { tAskTaskId: "task-id" },
    folderId: "generated_folder_123",
    name: "TASK-42 Folder",
    parentId: "root_folder_123",
  });

  assert.equal(folder.id, "generated_folder_123");
  assert.deepEqual(
    requests.map((request) => request.method),
    ["POST", "GET"],
  );
});

test("Google Drive generated file IDs are runtime validated", () => {
  assert.equal(
    parseGeneratedGoogleDriveFileId({ ids: ["generated_folder_123"] }),
    "generated_folder_123",
  );
  assert.throws(() => parseGeneratedGoogleDriveFileId({ ids: [] }), GoogleDriveApiError);
  assert.throws(
    () => parseGeneratedGoogleDriveFileId({ ids: ["invalid folder id"] }),
    GoogleDriveApiError,
  );
});

test("Google Drive root selection rejects files and read-only folders", () => {
  const base = {
    capabilities: { canAddChildren: true },
    id: "file-id",
    mimeType: googleDriveFolderMimeType,
    name: "Folder",
    trashed: false,
  };
  assert.throws(
    () => parseGoogleDriveFolder({ ...base, mimeType: "application/pdf" }),
    GoogleDriveApiError,
  );
  assert.throws(
    () => parseGoogleDriveFolder({ ...base, capabilities: { canAddChildren: false } }),
    GoogleDriveApiError,
  );
  assert.throws(
    () => parseGoogleDriveFolder({ ...base, webViewLink: "javascript:alert(1)" }),
    GoogleDriveApiError,
  );
});
