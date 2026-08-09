import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  ParseCompleteTelegramBrowserConnectPipe,
  ParseCompleteTelegramChatConnectionPipe,
  ParseCreateTelegramBrowserConnectIntentPipe,
} from "./telegram-connect.dto.js";

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

test("Telegram browser connect intent validates stable chat and sender identifiers", () => {
  const result = new ParseCreateTelegramBrowserConnectIntentPipe().transform({
    telegramChatId: "-100987654321",
    telegramId: "123456789",
    title: "Product team",
  });

  assert.equal(result.telegramChatId, "-100987654321");
  assert.equal(result.telegramId, "123456789");
  assert.throws(
    () =>
      new ParseCreateTelegramBrowserConnectIntentPipe().transform({
        telegramChatId: "group",
        telegramId: "123456789",
        title: null,
      }),
    BadRequestException,
  );
});

test("Telegram browser completion accepts workspace selection only as a UUID", () => {
  const authData = `id=123456789&auth_date=1786300000&hash=${"a".repeat(64)}`;
  const pipe = new ParseCompleteTelegramBrowserConnectPipe();

  assert.equal(pipe.transform({ authData }).authData, authData);
  assert.equal(
    pipe.transform({
      authData,
      workspaceId: "11111111-1111-4111-8111-111111111111",
    }).workspaceId,
    "11111111-1111-4111-8111-111111111111",
  );
  assert.throws(() => pipe.transform({ authData, workspaceId: "workspace" }), BadRequestException);
});
