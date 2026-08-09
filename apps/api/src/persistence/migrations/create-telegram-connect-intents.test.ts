import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramConnectIntentsQueries,
  dropTelegramConnectIntentsQueries,
} from "./1783298520000-create-telegram-connect-intents.js";

test("Telegram browser connect intents store hashed one-time chat and sender claims", () => {
  assert.match(createTelegramConnectIntentsQueries[0], /CREATE TABLE "telegram_connect_intents"/u);
  assert.match(createTelegramConnectIntentsQueries[0], /"token_hash" text NOT NULL/u);
  assert.match(createTelegramConnectIntentsQueries[0], /"telegram_chat_id" bigint NOT NULL/u);
  assert.match(createTelegramConnectIntentsQueries[0], /"telegram_id" bigint NOT NULL/u);
  assert.match(createTelegramConnectIntentsQueries[0], /"consumed_at" timestamptz/u);
});

test("Telegram browser connect intent migration is reversible", () => {
  assert.deepEqual(dropTelegramConnectIntentsQueries, [
    `DROP INDEX "idx_telegram_connect_intents_chat_id"`,
    `DROP TABLE "telegram_connect_intents"`,
  ]);
});
