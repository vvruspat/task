import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTelegramConfirmationCallbackContext,
  parseTelegramMessageContext,
  TelegramUpdateParseError,
} from "./telegram-update.js";

test("parseTelegramMessageContext normalizes direct text messages", () => {
  const context = parseTelegramMessageContext({
    update_id: 10,
    message: {
      message_id: 20,
      from: {
        id: 123456789,
        is_bot: false,
        username: "alex",
        first_name: "Alexander",
        last_name: "Example",
      },
      chat: {
        id: 123456789,
        type: "private",
      },
      text: "создай задачу записать бас",
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  });

  assert.deepEqual(context, {
    updateId: "10",
    messageId: "20",
    threadId: null,
    sender: {
      telegramId: "123456789",
      isBot: false,
      username: "alex",
      firstName: "Alexander",
      lastName: "Example",
    },
    chat: {
      telegramChatId: "123456789",
      type: "private",
      title: null,
    },
    text: "создай задачу записать бас",
    entities: [{ type: "bot_command", offset: 0, length: 6, url: null }],
    replyToMessageId: null,
    attachments: [],
  });
});

test("parseTelegramMessageContext preserves group chat and mention entities", () => {
  const context = parseTelegramMessageContext({
    update_id: 11,
    message: {
      message_id: 21,
      from: {
        id: 123456789,
        is_bot: false,
        username: "alex",
      },
      chat: {
        id: -100987654321,
        type: "supergroup",
        title: "Album Team",
      },
      text: "@task добавь ссылку к интро",
      entities: [{ type: "mention", offset: 0, length: 5 }],
      reply_to_message: {
        message_id: 19,
      },
    },
  });

  assert.equal(context.sender.telegramId, "123456789");
  assert.equal(context.chat.telegramChatId, "-100987654321");
  assert.equal(context.chat.title, "Album Team");
  assert.deepEqual(context.entities, [{ type: "mention", offset: 0, length: 5, url: null }]);
  assert.equal(context.replyToMessageId, "19");
});

test("parseTelegramMessageContext normalizes document and caption metadata", () => {
  const context = parseTelegramMessageContext({
    update_id: 12,
    message: {
      message_id: 22,
      from: {
        id: 123456789,
        is_bot: false,
      },
      chat: {
        id: 123456789,
        type: "private",
      },
      caption: "референс микса",
      caption_entities: [{ type: "text_link", offset: 0, length: 8, url: "https://example.test" }],
      document: {
        file_id: "file-1",
        file_unique_id: "unique-1",
        file_name: "reference.pdf",
        mime_type: "application/pdf",
        file_size: 2048,
      },
    },
  });

  assert.equal(context.text, "референс микса");
  assert.deepEqual(context.entities, [
    { type: "text_link", offset: 0, length: 8, url: "https://example.test" },
  ]);
  assert.deepEqual(context.attachments, [
    {
      kind: "document",
      fileId: "file-1",
      fileUniqueId: "unique-1",
      fileName: "reference.pdf",
      mimeType: "application/pdf",
      sizeBytes: "2048",
    },
  ]);
});

test("parseTelegramMessageContext picks the largest photo variant", () => {
  const context = parseTelegramMessageContext({
    update_id: 13,
    message: {
      message_id: 23,
      from: {
        id: 123456789,
        is_bot: false,
      },
      chat: {
        id: 123456789,
        type: "private",
      },
      photo: [
        { file_id: "small", width: 90, height: 90, file_size: 100 },
        { file_id: "large", file_unique_id: "photo-unique", width: 1280, height: 720 },
      ],
    },
  });

  assert.deepEqual(context.attachments, [
    {
      kind: "photo",
      fileId: "large",
      fileUniqueId: "photo-unique",
      width: 1280,
      height: 720,
      sizeBytes: null,
    },
  ]);
});

test("parseTelegramMessageContext rejects malformed webhook payloads", () => {
  assert.throws(() => parseTelegramMessageContext(null), TelegramUpdateParseError);
  assert.throws(() => parseTelegramMessageContext({ update_id: 1 }), TelegramUpdateParseError);
  assert.throws(
    () =>
      parseTelegramMessageContext({
        update_id: 1,
        message: {
          message_id: 2,
          from: { id: "123", is_bot: false },
          chat: { id: 123, type: "private" },
        },
      }),
    TelegramUpdateParseError,
  );
  assert.throws(
    () =>
      parseTelegramMessageContext({
        update_id: 1,
        message: {
          message_id: 2,
          from: { id: 123, is_bot: false },
          chat: { id: 123, type: "private" },
          entities: [{ type: "mention", offset: -1, length: 5 }],
        },
      }),
    TelegramUpdateParseError,
  );
});

test("parseTelegramConfirmationCallbackContext normalizes confirmation callbacks", () => {
  const context = parseTelegramConfirmationCallbackContext({
    update_id: 14,
    callback_query: {
      id: "callback-1",
      from: {
        id: 123456789,
        is_bot: false,
        username: "alex",
      },
      message: {
        message_id: 24,
        chat: {
          id: -100987654321,
          type: "supergroup",
          title: "Album Team",
        },
      },
      data: "task:confirmation:11111111-1111-4111-8111-111111111111:confirm",
    },
  });

  assert.deepEqual(context, {
    updateId: "14",
    callbackQueryId: "callback-1",
    confirmationRequestId: "11111111-1111-4111-8111-111111111111",
    action: "confirm",
    sender: {
      telegramId: "123456789",
      isBot: false,
      username: "alex",
      firstName: null,
      lastName: null,
    },
    chat: {
      telegramChatId: "-100987654321",
      type: "supergroup",
      title: "Album Team",
    },
    messageId: "24",
  });
});

test("parseTelegramConfirmationCallbackContext rejects malformed callback payloads", () => {
  assert.throws(
    () =>
      parseTelegramConfirmationCallbackContext({
        update_id: 14,
        callback_query: {
          id: "callback-1",
          from: { id: 123456789, is_bot: false },
          message: {
            message_id: 24,
            chat: { id: -100987654321, type: "supergroup" },
          },
          data: "task:confirmation:not-a-uuid:confirm",
        },
      }),
    TelegramUpdateParseError,
  );
  assert.throws(
    () =>
      parseTelegramConfirmationCallbackContext({
        update_id: 14,
        callback_query: {
          id: "callback-1",
          from: { id: 123456789, is_bot: false },
          message: {
            message_id: 24,
            chat: { id: -100987654321, type: "supergroup" },
          },
          data: "task:confirmation:11111111-1111-4111-8111-111111111111:approve",
        },
      }),
    TelegramUpdateParseError,
  );
});
