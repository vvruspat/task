import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramChatMessagesQueries,
  dropTelegramChatMessagesQueries,
} from "./1783298460000-create-telegram-chat-messages.js";

test("Telegram chat message storage is opt-in and scoped by chat and topic", () => {
  assert.match(createTelegramChatMessagesQueries[0], /SET DEFAULT false/u);
  assert.match(createTelegramChatMessagesQueries[1], /SET "history_access_enabled" = false/u);
  assert.match(createTelegramChatMessagesQueries[2], /CREATE TABLE "telegram_chat_messages"/u);
  assert.match(createTelegramChatMessagesQueries[2], /FOREIGN KEY/u);
  assert.match(createTelegramChatMessagesQueries[2], /ON DELETE CASCADE/u);
  assert.match(createTelegramChatMessagesQueries[3], /telegram_thread_id/u);
});

test("Telegram chat message migration is reversible", () => {
  assert.deepEqual(dropTelegramChatMessagesQueries, [
    `DROP INDEX "idx_telegram_chat_messages_chat_thread_message"`,
    `DROP TABLE "telegram_chat_messages"`,
    `ALTER TABLE "telegram_chats" ALTER COLUMN "history_access_enabled" SET DEFAULT true`,
  ]);
});
