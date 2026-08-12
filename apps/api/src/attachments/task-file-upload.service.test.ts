import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import type { AttachmentContentProvider } from "../integrations/attachment-content.provider.js";
import type { AttachmentUploadStore } from "./attachment-upload.store.js";
import type { TaskAttachment } from "./attachments.contracts.js";
import { TaskAttachmentDto } from "./attachments.dto.js";
import { TaskFileUploadService } from "./task-file-upload.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const attachmentId = "66666666-6666-4666-8666-666666666666";
const userId = "22222222-2222-4222-8222-222222222222";
const storageKey = `workspaces/${workspaceId}/tasks/${taskId}/stored-file`;

const attachment: TaskAttachment = {
  createdAt: new Date("2026-08-12T00:00:00.000Z"),
  createdByUserId: userId,
  externalResourceId: null,
  id: attachmentId,
  kind: "file",
  mimeType: "text/plain",
  modifiedAt: null,
  providerResourceId: null,
  sizeBytes: "5",
  source: "native",
  storageKey,
  targetId: taskId,
  targetType: "task",
  telegramFileId: null,
  title: "notes.txt",
  url: null,
  workspaceId,
};

test("task file upload stores bytes before creating attachment metadata", async () => {
  const calls: string[] = [];
  const service = new TaskFileUploadService(createUploadStore(calls), createContentProvider(), {
    async authorizeTaskFileUpload(): Promise<void> {
      calls.push("authorize");
    },
    async createTaskFileAttachment(_workspaceId, _projectId, _taskId, _userId, input) {
      calls.push(`create:${input.storageKey}`);
      return new TaskAttachmentDto({ ...attachment, ...input });
    },
    async listTaskAttachments(): Promise<TaskAttachmentDto[]> {
      return [];
    },
  });

  const result = await service.upload(workspaceId, projectId, taskId, userId, {
    bytes: Buffer.from("hello"),
    fileName: "notes.txt",
    mimeType: "text/plain",
  });

  assert.equal(result.storageKey, storageKey);
  assert.deepEqual(calls, ["authorize", "store:5", `create:${storageKey}`]);
});

test("task file upload removes stored bytes when attachment creation fails", async () => {
  const calls: string[] = [];
  const service = new TaskFileUploadService(createUploadStore(calls), createContentProvider(), {
    async authorizeTaskFileUpload(): Promise<void> {
      calls.push("authorize");
    },
    async createTaskFileAttachment(): Promise<never> {
      throw new ForbiddenException();
    },
    async listTaskAttachments(): Promise<TaskAttachmentDto[]> {
      return [];
    },
  });

  await assert.rejects(
    service.upload(workspaceId, projectId, taskId, userId, {
      bytes: Buffer.from("hello"),
      fileName: "notes.txt",
      mimeType: "text/plain",
    }),
    ForbiddenException,
  );
  assert.deepEqual(calls, ["authorize", "store:5", `remove:${storageKey}`]);
});

test("task file upload checks permission before storing bytes", async () => {
  const calls: string[] = [];
  const service = new TaskFileUploadService(createUploadStore(calls), createContentProvider(), {
    async authorizeTaskFileUpload(): Promise<never> {
      calls.push("authorize");
      throw new ForbiddenException();
    },
    async createTaskFileAttachment(): Promise<TaskAttachmentDto> {
      calls.push("create");
      return new TaskAttachmentDto(attachment);
    },
    async listTaskAttachments(): Promise<TaskAttachmentDto[]> {
      return [];
    },
  });

  await assert.rejects(
    service.upload(workspaceId, projectId, taskId, userId, {
      bytes: Buffer.from("hello"),
      fileName: "notes.txt",
      mimeType: "text/plain",
    }),
    ForbiddenException,
  );
  assert.deepEqual(calls, ["authorize"]);
});

test("task file download requires a visible native file and returns its content", async () => {
  const service = new TaskFileUploadService(createUploadStore([]), createContentProvider(), {
    async authorizeTaskFileUpload(): Promise<void> {},
    async createTaskFileAttachment(): Promise<TaskAttachmentDto> {
      return new TaskAttachmentDto(attachment);
    },
    async listTaskAttachments(): Promise<TaskAttachmentDto[]> {
      return [new TaskAttachmentDto(attachment)];
    },
  });

  const content = await service.read(workspaceId, projectId, taskId, attachmentId, userId);

  assert.equal(Buffer.from(content.bytes).toString("utf8"), "hello");
  assert.equal(content.fileName, "notes.txt");
});

function createUploadStore(calls: string[]): AttachmentUploadStore {
  return {
    async remove(key: string): Promise<void> {
      calls.push(`remove:${key}`);
    },
    async store(input): Promise<{ sizeBytes: string; storageKey: string }> {
      calls.push(`store:${input.bytes.byteLength}`);
      return { sizeBytes: String(input.bytes.byteLength), storageKey };
    },
  };
}

function createContentProvider(): AttachmentContentProvider {
  return {
    async read() {
      return {
        bytes: Buffer.from("hello"),
        fileName: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 5,
      };
    },
  };
}
