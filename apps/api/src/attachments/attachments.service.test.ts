import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { CreateTaskLinkAttachmentInput, TaskAttachment } from "./attachments.contracts.js";
import { TaskAttachmentDto } from "./attachments.dto.js";
import { AttachmentsService } from "./attachments.service.js";
import type { TaskAttachmentCreateResult, TaskAttachmentsStore } from "./attachments.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const attachmentId = "66666666-6666-4666-8666-666666666666";
const userId = "22222222-2222-4222-8222-222222222222";
const createdAt = new Date("2026-01-01T00:00:00.000Z");

const taskAttachment: TaskAttachment = {
  id: attachmentId,
  workspaceId,
  targetType: "task",
  targetId: taskId,
  kind: "link",
  title: "Bass take",
  url: "https://example.com/bass-take",
  storageKey: null,
  telegramFileId: null,
  mimeType: null,
  sizeBytes: null,
  createdByUserId: userId,
  createdAt,
};

test("AttachmentsService maps visible task attachments to DTOs", async () => {
  const service = new AttachmentsService(createAttachmentsStore({ attachments: [taskAttachment] }));

  const response = await service.listTaskAttachments(workspaceId, projectId, taskId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof TaskAttachmentDto);
  assert.equal(response[0]?.id, attachmentId);
  assert.equal(response[0]?.url, taskAttachment.url);
});

test("AttachmentsService creates link attachments for writable workspace members", async () => {
  const input: CreateTaskLinkAttachmentInput = {
    title: "Bass take reference",
    url: "https://example.com/reference",
  };
  const service = new AttachmentsService(
    createAttachmentsStore({
      createResult: {
        attachment: {
          ...taskAttachment,
          title: input.title ?? null,
          url: input.url,
        },
        status: "created",
      },
    }),
  );

  const response = await service.createTaskLinkAttachment(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.ok(response instanceof TaskAttachmentDto);
  assert.equal(response.kind, "link");
  assert.equal(response.url, input.url);
});

test("AttachmentsService hides inaccessible or missing tasks", async () => {
  const service = new AttachmentsService(createAttachmentsStore({ attachments: null }));

  await assert.rejects(
    () => service.listTaskAttachments(workspaceId, projectId, taskId, userId),
    NotFoundException,
  );
  await assert.rejects(
    () =>
      service.createTaskLinkAttachment(workspaceId, projectId, taskId, userId, {
        url: "https://example.com/hidden",
      }),
    NotFoundException,
  );
});

test("AttachmentsService rejects link attachments without write permission", async () => {
  const service = new AttachmentsService(
    createAttachmentsStore({ createResult: { status: "forbidden" } }),
  );

  await assert.rejects(
    () =>
      service.createTaskLinkAttachment(workspaceId, projectId, taskId, userId, {
        url: "https://example.com/hidden",
      }),
    ForbiddenException,
  );
});

function createAttachmentsStore(options: {
  attachments?: TaskAttachment[] | null;
  createResult?: TaskAttachmentCreateResult;
}): TaskAttachmentsStore {
  return {
    listForTask: async (): Promise<TaskAttachment[] | null> =>
      options.attachments === undefined ? [] : options.attachments,
    createLinkForTask: async (): Promise<TaskAttachmentCreateResult> =>
      options.createResult ?? { status: "task_not_found" },
  };
}
