import assert from "node:assert/strict";
import test from "node:test";
import { buildGoogleDriveTaskFolderName } from "./google-drive-task-folder.service.js";

test("Google Drive task folder names retain stable task identity and sanitize path-like titles", () => {
  assert.equal(
    buildGoogleDriveTaskFolderName("ops", 42, "  Review / Q3\\plan\nnow  "),
    "OPS-42 Review Q3 plan now",
  );
  assert.equal(buildGoogleDriveTaskFolderName("web", 7, "\u0000\u0007"), "WEB-7");
});

test("Google Drive task folder names stay within the provider-safe bound", () => {
  const name = buildGoogleDriveTaskFolderName("very-long-project-key", 1234, "x".repeat(1_000));
  assert.equal(name.length, 240);
  assert.match(name, /^VERY-LONG-PROJECT-KEY-1234 /u);
});
