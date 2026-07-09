import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ParseResolveTelegramContextBodyPipe,
  ParseTelegramConfirmationCallbackBodyPipe,
  TelegramConfirmationCallbackResultDto,
  TelegramContextResolutionDto,
} from "./telegram.dto.js";

test("ParseResolveTelegramContextBodyPipe validates stable Telegram identifiers", () => {
  const pipe = new ParseResolveTelegramContextBodyPipe();

  assert.deepEqual(
    pipe.transform({
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    }),
    {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    },
  );
});

test("ParseResolveTelegramContextBodyPipe rejects usernames and malformed identifiers", () => {
  const pipe = new ParseResolveTelegramContextBodyPipe();

  assert.throws(() => pipe.transform(null), BadRequestException);
  assert.throws(
    () => pipe.transform({ telegramId: "@alex", telegramChatId: "123456789" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ telegramId: "-123456789", telegramChatId: "123456789" }),
    BadRequestException,
  );
  assert.throws(
    () => pipe.transform({ telegramId: "123456789", telegramChatId: "chat" }),
    BadRequestException,
  );
});

test("TelegramContextResolutionDto preserves resolved context fields", () => {
  const dto = new TelegramContextResolutionDto({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });

  assert.deepEqual(
    { ...dto },
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
  );
});

test("ParseTelegramConfirmationCallbackBodyPipe validates confirmation callback payloads", () => {
  const pipe = new ParseTelegramConfirmationCallbackBodyPipe();

  assert.deepEqual(
    pipe.transform({
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
    }),
    {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
    },
  );
});

test("ParseTelegramConfirmationCallbackBodyPipe rejects malformed callback payloads", () => {
  const pipe = new ParseTelegramConfirmationCallbackBodyPipe();

  assert.throws(() => pipe.transform(null), BadRequestException);
  assert.throws(
    () =>
      pipe.transform({
        telegramId: "123456789",
        telegramChatId: "-100987654321",
        confirmationRequestId: "not-a-uuid",
        action: "confirm",
      }),
    BadRequestException,
  );
  assert.throws(
    () =>
      pipe.transform({
        telegramId: "123456789",
        telegramChatId: "-100987654321",
        confirmationRequestId: "11111111-1111-4111-8111-111111111111",
        action: "approve",
      }),
    BadRequestException,
  );
});

test("TelegramConfirmationCallbackResultDto preserves callback result fields", () => {
  const dto = new TelegramConfirmationCallbackResultDto({
    confirmationRequestId: "11111111-1111-4111-8111-111111111111",
    action: "cancel",
    status: "cancelled",
  });

  assert.deepEqual(
    { ...dto },
    {
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "cancel",
      status: "cancelled",
    },
  );
});
