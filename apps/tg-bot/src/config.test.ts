import assert from "node:assert/strict";
import test from "node:test";
import { InvalidTelegramBotEnvironmentError, parseTelegramBotConfig } from "./config.js";

const validEnvironment = {
  TELEGRAM_BOT_TOKEN: "123456:telegram-token",
  TASK_API_BOT_SHARED_SECRET: "bot-secret",
  TASK_API_BASE_URL: "https://api.example.test/",
};

test("parseTelegramBotConfig accepts required Telegram bot settings", () => {
  const config = parseTelegramBotConfig(validEnvironment);

  assert.deepEqual(config, {
    botToken: "123456:telegram-token",
    botUsername: null,
    backendBotSharedSecret: "bot-secret",
    backendBaseUrl: "https://api.example.test",
    webhookSecret: null,
    port: 3001,
  });
});

test("parseTelegramBotConfig accepts an explicit webhook secret", () => {
  const config = parseTelegramBotConfig({
    ...validEnvironment,
    TELEGRAM_WEBHOOK_SECRET: "webhook-secret",
  });

  assert.deepEqual(config, {
    botToken: "123456:telegram-token",
    botUsername: null,
    backendBotSharedSecret: "bot-secret",
    backendBaseUrl: "https://api.example.test",
    webhookSecret: "webhook-secret",
    port: 3001,
  });
});

test("parseTelegramBotConfig accepts a bot username for group mentions", () => {
  const config = parseTelegramBotConfig({
    ...validEnvironment,
    TELEGRAM_BOT_USERNAME: "task_agent_bot",
  });
  assert.equal(config.botUsername, "task_agent_bot");
  assert.throws(
    () => parseTelegramBotConfig({ ...validEnvironment, TELEGRAM_BOT_USERNAME: "@taskbot" }),
    InvalidTelegramBotEnvironmentError,
  );
});

test("parseTelegramBotConfig accepts an explicit webhook server port", () => {
  const config = parseTelegramBotConfig({
    ...validEnvironment,
    TELEGRAM_BOT_PORT: "4001",
  });

  assert.equal(config.port, 4001);
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
          TASK_API_BOT_SHARED_SECRET: "bot-secret",
          TASK_API_BASE_URL: "https://api.example.test",
        }),
      InvalidTelegramBotEnvironmentError,
    );
  }
});

test("parseTelegramBotConfig rejects missing or empty backend bot shared secrets", () => {
  assert.throws(
    () =>
      parseTelegramBotConfig({
        TELEGRAM_BOT_TOKEN: "123456:telegram-token",
        TASK_API_BASE_URL: "https://api.example.test",
      }),
    InvalidTelegramBotEnvironmentError,
  );

  for (const sharedSecret of ["", " secret"]) {
    assert.throws(
      () =>
        parseTelegramBotConfig({
          TELEGRAM_BOT_TOKEN: "123456:telegram-token",
          TASK_API_BOT_SHARED_SECRET: sharedSecret,
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
          TASK_API_BOT_SHARED_SECRET: "bot-secret",
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

test("parseTelegramBotConfig rejects invalid webhook server ports", () => {
  const invalidPorts = ["", "0", "65536", "-1", "3001.5", "port"];

  for (const port of invalidPorts) {
    assert.throws(
      () =>
        parseTelegramBotConfig({
          ...validEnvironment,
          TELEGRAM_BOT_PORT: port,
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
        TASK_API_BOT_SHARED_SECRET: " secret-token",
        TASK_API_BASE_URL: "https://api.example.test",
      }),
    (error: unknown): boolean => {
      assert.ok(error instanceof InvalidTelegramBotEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /secret-token/);
      return true;
    },
  );
  assert.throws(
    () =>
      parseTelegramBotConfig({
        TELEGRAM_BOT_TOKEN: "123456:telegram-token",
        TASK_API_BOT_SHARED_SECRET: "bot-secret",
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
