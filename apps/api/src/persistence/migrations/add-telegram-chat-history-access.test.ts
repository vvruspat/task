import assert from "node:assert/strict";
import test from "node:test";
import {
  addTelegramChatHistoryAccessQuery,
  removeTelegramChatHistoryAccessQuery,
} from "./1783298400000-add-telegram-chat-history-access.js";

test("Telegram chat history access is disabled for existing and new chats", () => {
  assert.match(addTelegramChatHistoryAccessQuery, /history_access_enabled/u);
  assert.match(addTelegramChatHistoryAccessQuery, /NOT NULL DEFAULT false/u);
});

test("Telegram chat history access migration is reversible", () => {
  assert.equal(
    removeTelegramChatHistoryAccessQuery,
    'ALTER TABLE "telegram_chats" DROP COLUMN "history_access_enabled"',
  );
});
