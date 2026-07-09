import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
  TaskAttachment,
} from "./attachments.contracts.js";
import { AttachmentsController } from "./attachments.controller.js";
import {
  ParseCreateTaskFileAttachmentBodyPipe,
  ParseCreateTaskLinkAttachmentBodyPipe,
  ParseCreateTaskTelegramFileAttachmentBodyPipe,
} from "./attachments.dto.js";
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

test("AttachmentsController uses trusted current user context for file attachment creates", async () => {
  const input: CreateTaskFileAttachmentInput = {
    storageKey: "workspaces/acme/tasks/bass-take.wav",
    title: "Bass take.wav",
    mimeType: "audio/wav",
    sizeBytes: "18432000",
  };
  const controller = new AttachmentsController(
    new AttachmentsService(
      createAttachmentsStore({
        createResult: {
          attachment: {
            ...taskAttachment,
            kind: "file",
            title: input.title ?? null,
            url: null,
            storageKey: input.storageKey,
            mimeType: input.mimeType ?? null,
            sizeBytes: input.sizeBytes ?? null,
          },
          status: "created",
        },
      }),
    ),
  );

  const response = await controller.createTaskFileAttachment(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.kind, "file");
  assert.equal(response.storageKey, input.storageKey);
  assert.equal(response.mimeType, input.mimeType);
  assert.equal(response.sizeBytes, input.sizeBytes);
});

test("AttachmentsController uses trusted current user context for Telegram file attachment creates", async () => {
  const input: CreateTaskTelegramFileAttachmentInput = {
    telegramFileId: "BQACAgIAAxkBAAIBR2Z",
    title: "Bass take.wav",
    mimeType: "audio/wav",
    sizeBytes: "18432000",
  };
  const controller = new AttachmentsController(
    new AttachmentsService(
      createAttachmentsStore({
        createResult: {
          attachment: {
            ...taskAttachment,
            kind: "telegram_file",
            title: input.title ?? null,
            url: null,
            telegramFileId: input.telegramFileId,
            mimeType: input.mimeType ?? null,
            sizeBytes: input.sizeBytes ?? null,
          },
          status: "created",
        },
      }),
    ),
  );

  const response = await controller.createTaskTelegramFileAttachment(
    workspaceId,
    projectId,
    taskId,
    userId,
    input,
  );

  assert.equal(response.kind, "telegram_file");
  assert.equal(response.telegramFileId, input.telegramFileId);
  assert.equal(response.mimeType, input.mimeType);
  assert.equal(response.sizeBytes, input.sizeBytes);
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

test("ParseCreateTaskFileAttachmentBodyPipe validates and normalizes file payloads", () => {
  const pipe = new ParseCreateTaskFileAttachmentBodyPipe();

  assert.deepEqual(
    pipe.transform({
      storageKey: "  workspaces/acme/tasks/bass-take.wav  ",
      title: "  Bass take.wav  ",
      mimeType: "  audio/wav  ",
      sizeBytes: "  18432000  ",
    }),
    {
      storageKey: "workspaces/acme/tasks/bass-take.wav",
      title: "Bass take.wav",
      mimeType: "audio/wav",
      sizeBytes: "18432000",
    },
  );
  assert.deepEqual(pipe.transform({ storageKey: "files/no-metadata.bin" }), {
    storageKey: "files/no-metadata.bin",
  });
  assert.deepEqual(
    pipe.transform({
      storageKey: "files/empty-metadata.bin",
      title: "",
      mimeType: "",
      sizeBytes: null,
    }),
    {
      storageKey: "files/empty-metadata.bin",
      title: null,
      mimeType: null,
      sizeBytes: null,
    },
  );

  assert.throws(() => pipe.transform({ storageKey: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ storageKey: 1 }), BadRequestException);
  assert.throws(
    () => pipe.transform({ storageKey: "files/file.bin", sizeBytes: "-1" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ storageKey: "files/file.bin", sizeBytes: "1.5" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ storageKey: "files/file.bin", sizeBytes: 1 }),
    BadRequestException,
  );
  assert.throws(() => pipe.transform(null), BadRequestException);
});

test("ParseCreateTaskTelegramFileAttachmentBodyPipe validates and normalizes Telegram file payloads", () => {
  const pipe = new ParseCreateTaskTelegramFileAttachmentBodyPipe();

  assert.deepEqual(
    pipe.transform({
      telegramFileId: "  BQACAgIAAxkBAAIBR2Z  ",
      title: "  Bass take.wav  ",
      mimeType: "  audio/wav  ",
      sizeBytes: "  18432000  ",
    }),
    {
      telegramFileId: "BQACAgIAAxkBAAIBR2Z",
      title: "Bass take.wav",
      mimeType: "audio/wav",
      sizeBytes: "18432000",
    },
  );
  assert.deepEqual(pipe.transform({ telegramFileId: "telegram-file-id" }), {
    telegramFileId: "telegram-file-id",
  });
  assert.deepEqual(
    pipe.transform({
      telegramFileId: "telegram-file-id",
      title: "",
      mimeType: "",
      sizeBytes: null,
    }),
    {
      telegramFileId: "telegram-file-id",
      title: null,
      mimeType: null,
      sizeBytes: null,
    },
  );

  assert.throws(() => pipe.transform({ telegramFileId: "" }), BadRequestException);
  assert.throws(() => pipe.transform({ telegramFileId: 1 }), BadRequestException);
  assert.throws(
    () => pipe.transform({ telegramFileId: "telegram-file-id", sizeBytes: "-1" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ telegramFileId: "telegram-file-id", sizeBytes: 1 }),
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
    createFileForTask: async (): Promise<TaskAttachmentCreateResult> =>
      options.createResult ?? { status: "task_not_found" },
    createTelegramFileForTask: async (): Promise<TaskAttachmentCreateResult> =>
      options.createResult ?? { status: "task_not_found" },
  };
}
