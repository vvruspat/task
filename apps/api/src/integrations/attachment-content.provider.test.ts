import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  type AttachmentContentSource,
  AttachmentContentUnavailableError,
  buildAttachmentFileName,
  LocalAttachmentContentProvider,
  normalizeAttachmentMimeType,
} from "./attachment-content.provider.js";

const baseSource: AttachmentContentSource = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  kind: "file",
  mimeType: "text/plain",
  sizeBytes: "5",
  storageKey: "tasks/note.txt",
  telegramFileId: null,
  title: "Sprint / notes.txt",
};

test("local attachment provider reads a bounded file under its configured root", async (context) => {
  const rootPath = await mkdtemp(join(tmpdir(), "task-attachment-provider-"));
  context.after(async () => rm(rootPath, { force: true, recursive: true }));
  await mkdir(join(rootPath, "tasks"));
  await writeFile(join(rootPath, "tasks", "note.txt"), "hello");

  const content = await new LocalAttachmentContentProvider({
    maxBytes: 1_024,
    storageRoot: rootPath,
  }).read(baseSource);

  assert.equal(content?.fileName, "Sprint notes.txt");
  assert.equal(content?.mimeType, "text/plain");
  assert.equal(content?.sizeBytes, 5);
  assert.equal(Buffer.from(content?.bytes ?? []).toString("utf8"), "hello");
});

test("local attachment provider rejects traversal through a symlink", async (context) => {
  const rootPath = await mkdtemp(join(tmpdir(), "task-attachment-root-"));
  const outsidePath = await mkdtemp(join(tmpdir(), "task-attachment-outside-"));
  context.after(async () => {
    await rm(rootPath, { force: true, recursive: true });
    await rm(outsidePath, { force: true, recursive: true });
  });
  await writeFile(join(outsidePath, "secret.txt"), "secret");
  await symlink(outsidePath, join(rootPath, "escaped"));

  const provider = new LocalAttachmentContentProvider({ maxBytes: 1_024, storageRoot: rootPath });
  await assert.rejects(
    provider.read({ ...baseSource, sizeBytes: "6", storageKey: "escaped/secret.txt" }),
    AttachmentContentUnavailableError,
  );
});

test("local attachment provider enforces metadata and byte limits", async (context) => {
  const rootPath = await mkdtemp(join(tmpdir(), "task-attachment-provider-"));
  context.after(async () => rm(rootPath, { force: true, recursive: true }));
  await mkdir(join(rootPath, "tasks"));
  await writeFile(join(rootPath, "tasks", "note.txt"), "hello");
  const provider = new LocalAttachmentContentProvider({ maxBytes: 4, storageRoot: rootPath });

  await assert.rejects(provider.read(baseSource), /export limit/u);
  await assert.rejects(
    new LocalAttachmentContentProvider({ maxBytes: 10, storageRoot: rootPath }).read({
      ...baseSource,
      sizeBytes: "4",
    }),
    /does not match/u,
  );
});

test("attachment export normalizes provider-facing names and MIME types", () => {
  assert.equal(
    buildAttachmentFileName({ id: baseSource.id, title: "a\\b/c\n.pdf" }, "x"),
    "a b c .pdf",
  );
  assert.equal(
    normalizeAttachmentMimeType("text/plain\r\nx-unsafe: true"),
    "application/octet-stream",
  );
  assert.equal(normalizeAttachmentMimeType("application/pdf"), "application/pdf");
});
