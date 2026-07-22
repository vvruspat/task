import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ParseCompleteTelegramChatConnectionPipe } from "./telegram-connect.dto.js";

const token = "a".repeat(43);

test("Telegram connect payload validates stable Telegram identifiers and one-time token", () => {
  const pipe = new ParseCompleteTelegramChatConnectionPipe();
  const result = pipe.transform({
    telegramChatId: "-100987654321",
    telegramId: "123456789",
    title: "Product team",
    token,
  });
  assert.equal(result.telegramChatId, "-100987654321");
  assert.equal(result.telegramId, "123456789");
  assert.equal(result.title, "Product team");
  assert.equal(result.token, token);
  assert.throws(
    () =>
      pipe.transform({
        telegramChatId: "@chat",
        telegramId: "123456789",
        title: null,
        token,
      }),
    BadRequestException,
  );
  assert.throws(
    () =>
      pipe.transform({
        telegramChatId: "-100987654321",
        telegramId: "123456789",
        title: null,
        token: "short",
      }),
    BadRequestException,
  );
});
