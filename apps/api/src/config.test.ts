import assert from "node:assert/strict";
import test from "node:test";
import { InvalidApiEnvironmentError, parseApiConfig } from "./config.js";

test("parseApiConfig defaults PORT to 3000", () => {
  const config = parseApiConfig({});

  assert.equal(config.port, 3000);
});

test("parseApiConfig leaves database config unset when DATABASE_URL is absent", () => {
  const config = parseApiConfig({});

  assert.equal(config.database, null);
});

test("parseApiConfig leaves bot auth unset when TELEGRAM_BOT_SHARED_SECRET is absent", () => {
  const config = parseApiConfig({});

  assert.equal(config.botAuth, null);
});

test("parseApiConfig leaves Telegram Mini App config unset when TELEGRAM_BOT_TOKEN is absent", () => {
  const config = parseApiConfig({});

  assert.equal(config.telegramMiniApp, null);
});

test("parseApiConfig leaves OpenRouter config unset when agent runtime env is absent", () => {
  const config = parseApiConfig({});

  assert.equal(config.openRouter, null);
});

test("parseApiConfig accepts a valid TELEGRAM_BOT_SHARED_SECRET", () => {
  const config = parseApiConfig({ TELEGRAM_BOT_SHARED_SECRET: "bot-secret" });

  assert.deepEqual(config.botAuth, { sharedSecret: "bot-secret" });
});

test("parseApiConfig accepts a valid TELEGRAM_BOT_TOKEN", () => {
  const config = parseApiConfig({ TELEGRAM_BOT_TOKEN: "123456:telegram-bot-token" });

  assert.deepEqual(config.telegramMiniApp, { botToken: "123456:telegram-bot-token" });
});

test("parseApiConfig rejects invalid TELEGRAM_BOT_SHARED_SECRET values", () => {
  const invalidSecrets = ["", " secret", "secret "];

  for (const sharedSecret of invalidSecrets) {
    assert.throws(
      () => parseApiConfig({ TELEGRAM_BOT_SHARED_SECRET: sharedSecret }),
      InvalidApiEnvironmentError,
    );
  }
});

test("parseApiConfig rejects invalid TELEGRAM_BOT_TOKEN values", () => {
  const invalidTokens = ["", " token", "token "];

  for (const botToken of invalidTokens) {
    assert.throws(
      () => parseApiConfig({ TELEGRAM_BOT_TOKEN: botToken }),
      InvalidApiEnvironmentError,
    );
  }
});

test("parseApiConfig redacts invalid TELEGRAM_BOT_SHARED_SECRET values in error messages", () => {
  assert.throws(
    () => parseApiConfig({ TELEGRAM_BOT_SHARED_SECRET: " secret-token " }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidApiEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /secret-token/);
      return true;
    },
  );
});

test("parseApiConfig redacts invalid TELEGRAM_BOT_TOKEN values in error messages", () => {
  assert.throws(
    () => parseApiConfig({ TELEGRAM_BOT_TOKEN: " secret-token " }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidApiEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /secret-token/);
      return true;
    },
  );
});

test("parseApiConfig accepts a valid DATABASE_URL", () => {
  const databaseUrl = "postgresql://task_user:task_password@localhost:5432/task_db";
  const config = parseApiConfig({ DATABASE_URL: databaseUrl });

  assert.deepEqual(config.database, { url: databaseUrl });
});

test("parseApiConfig accepts valid OpenRouter settings", () => {
  const config = parseApiConfig({
    OPENROUTER_API_KEY: "openrouter-secret",
    OPENROUTER_MODEL: "openai/gpt-4.1-mini",
  });

  assert.deepEqual(config.openRouter, {
    apiKey: "openrouter-secret",
    appTitle: "tAsk",
    fallbackModel: null,
    model: "openai/gpt-4.1-mini",
    siteUrl: null,
  });
});

test("parseApiConfig accepts optional OpenRouter runtime metadata", () => {
  const config = parseApiConfig({
    OPENROUTER_API_KEY: "openrouter-secret",
    OPENROUTER_APP_TITLE: "tAsk Staging",
    OPENROUTER_FALLBACK_MODEL: "anthropic/claude-3.5-sonnet",
    OPENROUTER_MODEL: "openai/gpt-4.1-mini",
    OPENROUTER_SITE_URL: "https://task.example",
  });

  assert.deepEqual(config.openRouter, {
    apiKey: "openrouter-secret",
    appTitle: "tAsk Staging",
    fallbackModel: "anthropic/claude-3.5-sonnet",
    model: "openai/gpt-4.1-mini",
    siteUrl: "https://task.example",
  });
});

test("parseApiConfig rejects partial OpenRouter settings", () => {
  assert.throws(
    () => parseApiConfig({ OPENROUTER_API_KEY: "openrouter-secret" }),
    InvalidApiEnvironmentError,
  );
  assert.throws(
    () => parseApiConfig({ OPENROUTER_MODEL: "openai/gpt-4.1-mini" }),
    InvalidApiEnvironmentError,
  );
  assert.throws(
    () => parseApiConfig({ OPENROUTER_APP_TITLE: "tAsk Staging" }),
    InvalidApiEnvironmentError,
  );
  assert.throws(
    () => parseApiConfig({ OPENROUTER_SITE_URL: "https://task.example" }),
    InvalidApiEnvironmentError,
  );
});

test("parseApiConfig rejects invalid OpenRouter settings", () => {
  const invalidApiKeys = ["", " secret", "secret "];

  for (const apiKey of invalidApiKeys) {
    assert.throws(
      () =>
        parseApiConfig({
          OPENROUTER_API_KEY: apiKey,
          OPENROUTER_MODEL: "openai/gpt-4.1-mini",
        }),
      InvalidApiEnvironmentError,
    );
  }

  const invalidModels = ["", " openai/gpt-4.1-mini", "openai/gpt-4.1-mini ", "openai/gpt 4.1"];

  for (const model of invalidModels) {
    assert.throws(
      () =>
        parseApiConfig({
          OPENROUTER_API_KEY: "openrouter-secret",
          OPENROUTER_MODEL: model,
        }),
      InvalidApiEnvironmentError,
    );
  }

  for (const fallbackModel of invalidModels) {
    assert.throws(
      () =>
        parseApiConfig({
          OPENROUTER_API_KEY: "openrouter-secret",
          OPENROUTER_FALLBACK_MODEL: fallbackModel,
          OPENROUTER_MODEL: "openai/gpt-4.1-mini",
        }),
      InvalidApiEnvironmentError,
    );
  }

  const invalidAppTitles = ["", " tAsk", "tAsk "];

  for (const appTitle of invalidAppTitles) {
    assert.throws(
      () =>
        parseApiConfig({
          OPENROUTER_API_KEY: "openrouter-secret",
          OPENROUTER_APP_TITLE: appTitle,
          OPENROUTER_MODEL: "openai/gpt-4.1-mini",
        }),
      InvalidApiEnvironmentError,
    );
  }

  const invalidSiteUrls = ["", " https://task.example", "http://task.example", "not-a-url"];

  for (const siteUrl of invalidSiteUrls) {
    assert.throws(
      () =>
        parseApiConfig({
          OPENROUTER_API_KEY: "openrouter-secret",
          OPENROUTER_MODEL: "openai/gpt-4.1-mini",
          OPENROUTER_SITE_URL: siteUrl,
        }),
      InvalidApiEnvironmentError,
    );
  }
});

test("parseApiConfig redacts invalid OPENROUTER_API_KEY values in error messages", () => {
  assert.throws(
    () =>
      parseApiConfig({
        OPENROUTER_API_KEY: " openrouter-secret ",
        OPENROUTER_MODEL: "openai/gpt-4.1-mini",
      }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidApiEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /openrouter-secret/);
      return true;
    },
  );
});

test("parseApiConfig rejects invalid DATABASE_URL values", () => {
  const invalidDatabaseUrls = [
    "",
    " postgresql://task_user:task_password@localhost:5432/task_db",
    "http://task_user:task_password@localhost:5432/task_db",
    "postgresql:///task_db",
    "postgresql://localhost:5432/task_db",
    "postgresql://task_user:task_password@localhost:5432",
  ];

  for (const databaseUrl of invalidDatabaseUrls) {
    assert.throws(() => parseApiConfig({ DATABASE_URL: databaseUrl }), InvalidApiEnvironmentError);
  }
});

test("parseApiConfig redacts invalid DATABASE_URL values in error messages", () => {
  assert.throws(
    () => parseApiConfig({ DATABASE_URL: "http://task_user:task_password@localhost:5432/task_db" }),
    (error: unknown) => {
      assert.ok(error instanceof InvalidApiEnvironmentError);
      assert.match(error.message, /Received "\[redacted\]"/);
      assert.doesNotMatch(error.message, /task_user/);
      assert.doesNotMatch(error.message, /task_password/);
      return true;
    },
  );
});

test("parseApiConfig accepts a valid PORT", () => {
  const config = parseApiConfig({ PORT: "4000" });

  assert.equal(config.port, 4000);
});

test("parseApiConfig rejects invalid PORT values", () => {
  const invalidPorts = ["", "0", "-1", "65536", "3000abc", "abc3000", "3.5"];

  for (const port of invalidPorts) {
    assert.throws(() => parseApiConfig({ PORT: port }), InvalidApiEnvironmentError);
  }
});
