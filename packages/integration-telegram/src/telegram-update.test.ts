import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTelegramAgentInput,
  parseTelegramMessageContext,
  TelegramUpdateParseError,
} from "./telegram-update.js";

function telegramUpdate(text: string, entities: unknown[], messageThreadId: unknown = 17): unknown {
  return {
    update_id: 10,
    message: {
      message_id: 20,
      message_thread_id: messageThreadId,
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
      text,
      entities,
    },
  };
}

test("Telegram message parsing keeps topic id and strips the task command", () => {
  const message = parseTelegramMessageContext(
    telegramUpdate("/task@t_ask_me_bot какие проекты у нас созданы?", [
      { type: "bot_command", offset: 0, length: 18 },
    ]),
  );

  assert.equal(message.threadId, "17");
  assert.equal(
    normalizeTelegramAgentInput(message, "t_ask_me_bot"),
    "какие проекты у нас созданы?",
  );
});

test("Telegram agent input strips the configured mention without touching other text", () => {
  const message = parseTelegramMessageContext(
    telegramUpdate("@t_ask_me_bot какие проекты у нас созданы?", [
      { type: "mention", offset: 0, length: 13 },
    ]),
  );

  assert.equal(
    normalizeTelegramAgentInput(message, "t_ask_me_bot"),
    "какие проекты у нас созданы?",
  );
});

test("Telegram message parsing rejects malformed topic ids", () => {
  assert.throws(
    () => parseTelegramMessageContext(telegramUpdate("/task help", [], "topic")),
    TelegramUpdateParseError,
  );
});
