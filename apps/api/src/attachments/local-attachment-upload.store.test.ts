import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { LocalAttachmentUploadStore } from "./local-attachment-upload.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const taskId = "44444444-4444-4444-8444-444444444444";

test("local attachment upload store writes private content under a generated task key", async (context) => {
  const rootPath = await mkdtemp(join(tmpdir(), "task-file-upload-"));
  context.after(async () => rm(rootPath, { force: true, recursive: true }));
  const store = new LocalAttachmentUploadStore({ storageRoot: rootPath });

  const stored = await store.store({
    bytes: Buffer.from("hello"),
    taskId,
    workspaceId,
  });

  assert.match(stored.storageKey, new RegExp(`^workspaces/${workspaceId}/tasks/${taskId}/`, "u"));
  assert.equal(stored.sizeBytes, "5");
  assert.equal(await readFile(resolve(rootPath, stored.storageKey), "utf8"), "hello");
  await store.remove(stored.storageKey);
  await assert.rejects(readFile(resolve(rootPath, stored.storageKey)), { code: "ENOENT" });
});

test("local attachment upload store requires configured storage", async () => {
  await assert.rejects(
    new LocalAttachmentUploadStore({ storageRoot: null }).store({
      bytes: Buffer.from("hello"),
      taskId,
      workspaceId,
    }),
    ServiceUnavailableException,
  );
});
