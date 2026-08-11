import assert from "node:assert/strict";
import test from "node:test";
import { googleDriveFolderMimeType } from "./google-drive.client.js";
import type { GoogleDriveChange, GoogleDriveChangedFile } from "./google-drive-changes.client.js";
import {
  canDiscoverGoogleDriveFile,
  googleDriveManagedTaskForFile,
  stableGoogleDriveActivityEventId,
} from "./typeorm-google-drive-change.store.js";

test("Google Drive activity IDs are stable UUIDs for retry deduplication", () => {
  const identity = "connection:file:2026-07-22T12:00:00Z:7:changed:task";
  const first = stableGoogleDriveActivityEventId(identity);

  assert.equal(first, stableGoogleDriveActivityEventId(identity));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/u);
  assert.notEqual(first, stableGoogleDriveActivityEventId(`${identity}:other`));
});

test("external Drive files are discovered only directly inside an assigned task folder", () => {
  const file = changedFile();
  const taskIdByFolder = new Map([["task-folder", "task-id"]]);

  assert.equal(googleDriveManagedTaskForFile(file, taskIdByFolder), "task-id");
  assert.equal(canDiscoverGoogleDriveFile(change(file), "task-id"), true);
  assert.equal(
    googleDriveManagedTaskForFile({ ...file, parentId: "different-folder" }, taskIdByFolder),
    null,
  );
  assert.equal(
    canDiscoverGoogleDriveFile(change({ ...file, mimeType: googleDriveFolderMimeType }), "task-id"),
    false,
  );
  assert.equal(canDiscoverGoogleDriveFile({ ...change(file), removed: true }, "task-id"), false);
  assert.equal(canDiscoverGoogleDriveFile(change({ ...file, trashed: true }), "task-id"), false);
});

function changedFile(): GoogleDriveChangedFile {
  return {
    id: "drive-file",
    mimeType: "text/plain",
    modifiedAt: "2026-08-11T12:00:00.000Z",
    name: "notes.txt",
    parentId: "task-folder",
    trashed: false,
    version: "7",
    webViewLink: "https://drive.google.com/file/d/drive-file/view",
  };
}

function change(file: GoogleDriveChangedFile): GoogleDriveChange {
  return {
    file,
    fileId: file.id,
    removed: false,
    time: "2026-08-11T12:00:00.000Z",
  };
}
