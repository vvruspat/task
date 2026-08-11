import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoogleDriveProjectFolderName,
  buildGoogleDriveTaskFolderName,
} from "./google-drive-task-folder.service.js";

test("Google Drive project and task folders use sanitized entity names", () => {
  assert.equal(buildGoogleDriveTaskFolderName("  Review / Q3\\plan\nnow  "), "Review Q3 plan now");
  assert.equal(buildGoogleDriveTaskFolderName("\u0000\u0007"), "Task");
  assert.equal(buildGoogleDriveProjectFolderName("  Album / release  "), "Album release");
});

test("Google Drive task folder names stay within the provider-safe bound", () => {
  const name = buildGoogleDriveTaskFolderName("x".repeat(1_000));
  assert.equal(name.length, 240);
  assert.match(name, /^x+$/u);
});
