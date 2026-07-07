import assert from "node:assert/strict";
import test from "node:test";
import type { TelegramBotRuntime } from "./runtime.js";
import type { TelegramUpdateProcessorResult } from "./update-processor.js";
import {
  handleTelegramWebhookRequest,
  TelegramWebhookHandlerError,
  telegramWebhookSecretHeaderName,
} from "./webhook-handler.js";

const telegramUpdate = { update_id: 10 };
const replySentResult: TelegramUpdateProcessorResult = {
  kind: "reply_sent",
  reply: {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
  },
  sentMessage: { messageId: "45" },
};

test("handleTelegramWebhookRequest accepts requests with matching Telegram secret headers", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);

  assert.deepEqual(
    await handleTelegramWebhookRequest(
      {
        update: telegramUpdate,
        secretTokenHeader: "webhook-secret",
      },
      {
        config: { webhookSecret: "webhook-secret" },
        runtime,
      },
    ),
    {
      status: "accepted",
      result: replySentResult,
    },
  );
  assert.equal(runtime.lastUpdate, telegramUpdate);
});

test("handleTelegramWebhookRequest rejects missing or mismatched Telegram secret headers", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);

  assert.deepEqual(
    await handleTelegramWebhookRequest(
      {
        update: telegramUpdate,
        secretTokenHeader: null,
      },
      {
        config: { webhookSecret: "webhook-secret" },
        runtime,
      },
    ),
    { status: "unauthorized" },
  );
  assert.deepEqual(
    await handleTelegramWebhookRequest(
      {
        update: telegramUpdate,
        secretTokenHeader: "wrong-secret",
      },
      {
        config: { webhookSecret: "webhook-secret" },
        runtime,
      },
    ),
    { status: "unauthorized" },
  );
  assert.equal(runtime.lastUpdate, null);
});

test("handleTelegramWebhookRequest accepts requests without a configured webhook secret", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);

  const result = await handleTelegramWebhookRequest(
    {
      update: telegramUpdate,
      secretTokenHeader: null,
    },
    {
      config: { webhookSecret: null },
      runtime,
    },
  );

  assert.equal(result.status, "accepted");
  assert.equal(runtime.lastUpdate, telegramUpdate);
});

test("handleTelegramWebhookRequest wraps runtime failures in typed results", async () => {
  const runtimeError = new Error("Runtime failed.");

  const result = await handleTelegramWebhookRequest(
    {
      update: telegramUpdate,
      secretTokenHeader: "webhook-secret",
    },
    {
      config: { webhookSecret: "webhook-secret" },
      runtime: new FailingTelegramBotRuntime(runtimeError),
    },
  );

  assert.equal(result.status, "failed");

  if (result.status === "failed") {
    assert.ok(result.error instanceof TelegramWebhookHandlerError);
    assert.equal(result.error.cause, runtimeError);
  }
});

test("telegram webhook secret header name follows Telegram Bot API", () => {
  assert.equal(telegramWebhookSecretHeaderName, "x-telegram-bot-api-secret-token");
});

class RecordingTelegramBotRuntime implements TelegramBotRuntime {
  lastUpdate: unknown | null = null;

  constructor(private readonly result: TelegramUpdateProcessorResult) {}

  async processUpdate(update: unknown): Promise<TelegramUpdateProcessorResult> {
    this.lastUpdate = update;

    return this.result;
  }
}

class FailingTelegramBotRuntime implements TelegramBotRuntime {
  constructor(private readonly error: Error) {}

  async processUpdate(): Promise<TelegramUpdateProcessorResult> {
    throw this.error;
  }
}
