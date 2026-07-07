import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type { CreateTaskLinkAttachmentInput, TaskAttachment } from "./attachments.contracts.js";
import { AttachmentsController } from "./attachments.controller.js";
import { ParseCreateTaskLinkAttachmentBodyPipe } from "./attachments.dto.js";
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

test("AttachmentsController uses trusted current user context for attachment list reads", async () => {
  const controller = new AttachmentsController(
    new AttachmentsService(createAttachmentsStore({ attachments: [taskAttachment] })),
  );

  const response = await controller.listTaskAttachments(workspaceId, projectId, taskId, userId);

  assert.equal(response.length, 1);
  assert.equal(response[0]?.id, attachmentId);
});

test("AttachmentsController uses trusted current user context for link attachment creates", async () => {
  const input: CreateTaskLinkAttachmentInput = {
    title: "Bass take reference",
    url: "https://example.com/reference",
  };
  const controller = new AttachmentsController(
    new AttachmentsService(
      createAttachmentsStore({
        createResult: {
          attachment: { ...taskAttachment, title: input.title ?? null, url: input.url },
          status: "created",
        },
      }),
    ),
  );

  const response = await controller.createTaskLinkAttachment(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.kind, "link");
  assert.equal(response.url, input.url);
});

test("ParseCreateTaskLinkAttachmentBodyPipe validates and normalizes link payloads", () => {
  const pipe = new ParseCreateTaskLinkAttachmentBodyPipe();

  assert.deepEqual(
    pipe.transform({
      title: "  Bass take  ",
      url: "https://example.com/bass-take",
    }),
    {
      title: "Bass take",
      url: "https://example.com/bass-take",
    },
  );
  assert.deepEqual(pipe.transform({ title: "", url: "http://example.com/" }), {
    title: null,
    url: "http://example.com/",
  });

  assert.throws(() => pipe.transform({ url: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ url: "not a url" }), BadRequestException);
  assert.throws(() => pipe.transform({ url: "ftp://example.com/file" }), BadRequestException);
  assert.throws(
    () => pipe.transform({ title: 1, url: "https://example.com/" }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
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
