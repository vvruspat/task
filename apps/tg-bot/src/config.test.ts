import assert from "node:assert/strict";
import test from "node:test";
import { InvalidTelegramBotEnvironmentError, parseTelegramBotConfig } from "./config.js";

const validEnvironment = {
  TELEGRAM_BOT_TOKEN: "123456:telegram-token",
  TASK_API_BASE_URL: "https://api.example.test/",
};

test("parseTelegramBotConfig accepts required Telegram bot settings", () => {
  const config = parseTelegramBotConfig(validEnvironment);

  assert.deepEqual(config, {
    botToken: "123456:telegram-token",
    backendBaseUrl: "https://api.example.test",
    webhookSecret: null,
  });
});

test("parseTelegramBotConfig accepts an explicit webhook secret", () => {
  const config = parseTelegramBotConfig({
    ...validEnvironment,
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  });

  assert.deepEqual(config, {
    botToken: "123456:telegram-token",
    backendBaseUrl: "https://api.example.test",
    webhookSecret: "webhook-secret",
  });
});

test("parseTelegramBotConfig rejects missing or empty bot tokens", () => {
  assert.throws(
    () => parseTelegramBotConfig({ TASK_API_BASE_URL: "https://api.example.test" }),
    InvalidTelegramBotEnvironmentError,
  );

  for (const botToken of ["", " token"]) {
    assert.throws(
      () =>
        parseTelegramBotConfig({
          TELEGRAM_BOT_TOKEN: botToken,
          TASK_API_BASE_URL: "https://api.example.test",
        }),
      InvalidTelegramBotEnvironmentError,
    );
  }
});

test("parseTelegramBotConfig rejects invalid backend base URLs", () => {
  const invalidBaseUrls = ["", " http://localhost:3000", "postgresql://localhost/task", "http://"];

  for (const backendBaseUrl of invalidBaseUrls) {
    assert.throws(
      () =>
        parseTelegramBotConfig({
          TELEGRAM_BOT_TOKEN: "123456:telegram-token",
          TASK_API_BASE_URL: backendBaseUrl,
        }),
      InvalidTelegramBotEnvironmentError,
    );
  }
});

test("parseTelegramBotConfig rejects empty webhook secrets", () => {
  for (const webhookSecret of ["", " secret"]) {
    assert.throws(
      () =>
        parseTelegramBotConfig({
          ...validEnvironment,
          TELEGRAM_WEBHOOK_SECRET: webhookSecret,
        }),
      InvalidTelegramBotEnvironmentError,
    );
  }
});

test("parseTelegramBotConfig redacts sensitive environment values in errors", () => {
  assert.throws(
    () =>
      parseTelegramBotConfig({
        TELEGRAM_BOT_TOKEN: " token",
        TASK_API_BASE_URL: "https://api.example.test",
      }),
    (error: unknown): boolean => {
      assert.ok(error instanceof InvalidTelegramBotEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, / token/);
      return true;
    },
  );
  assert.throws(
    () =>
      parseTelegramBotConfig({
        TELEGRAM_BOT_TOKEN: "123456:telegram-token",
        TASK_API_BASE_URL: "postgresql://task_user:task_password@localhost/task_db",
      }),
    (error: unknown): boolean => {
      assert.ok(error instanceof InvalidTelegramBotEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /task_user/);
      assert.doesNotMatch(error.message, /task_password/);
      return true;
    },
  );
});
