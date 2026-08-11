import assert from "node:assert/strict";
import test from "node:test";
import { googleDriveFileToChange } from "./google-drive-folder-assignment.service.js";

test("existing task folder files become synthetic Drive changes for initial synchronization", () => {
  const change = googleDriveFileToChange(
    {
      appProperties: {},
      id: "drive-file",
      mimeType: "application/pdf",
      modifiedAt: "2026-08-11T09:00:00.000Z",
      name: "brief.pdf",
      parentId: "task-folder",
      version: "8",
      webViewLink: "https://drive.google.com/file/d/drive-file/view",
    },
    new Date("2026-08-11T10:00:00.000Z"),
  );

  assert.equal(change.fileId, "drive-file");
  assert.equal(change.time, "2026-08-11T09:00:00.000Z");
  assert.equal(change.file?.parentId, "task-folder");
  assert.equal(change.file?.trashed, false);
});
