import assert from "node:assert/strict";
import test from "node:test";
import { parseGooglePickerSelection } from "./google-drive-picker.ts";

test("Google Picker response accepts one bounded folder id", () => {
  assert.deepEqual(
    parseGooglePickerSelection({ action: "picked", docs: [{ id: "folder_Id-123" }] }),
    { folderId: "folder_Id-123", kind: "picked" },
  );
  assert.deepEqual(parseGooglePickerSelection({ action: "cancel" }), { kind: "cancelled" });
});

test("Google Picker response rejects malformed or ambiguous selections", () => {
  assert.deepEqual(parseGooglePickerSelection({ action: "picked", docs: [] }), {
    kind: "pending",
  });
  assert.deepEqual(
    parseGooglePickerSelection({ action: "picked", docs: [{ id: "one" }, { id: "two" }] }),
    { kind: "pending" },
  );
  assert.deepEqual(parseGooglePickerSelection({ action: "picked", docs: [{ id: "bad/id" }] }), {
    kind: "pending",
  });
});
