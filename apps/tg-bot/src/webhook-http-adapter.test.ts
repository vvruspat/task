import assert from "node:assert/strict";
import test from "node:test";
import type {
  IntegrationWebhookRequest,
  IntegrationWebhookVerificationResult,
} from "@task/integration-sdk";
import { createTelegramWebhookHandler } from "@task/integration-telegram";
import type { TelegramBotRuntime } from "./runtime.js";
import type { TelegramUpdateProcessorResult } from "./update-processor.js";
import { handleTelegramWebhookHttpRequest } from "./webhook-http-adapter.js";

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

test("handleTelegramWebhookHttpRequest accepts POST requests with matching secret headers", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);

  const response = await handleTelegramWebhookHttpRequest(
    {
      method: "post",
      headers: {
        "X-Telegram-Bot-Api-Secret-Token": "webhook-secret",
      },
      body: telegramUpdate,
    },
    {
      runtime,
    },
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { status: "accepted" });
  assert.equal(runtime.lastUpdate, telegramUpdate);
});

test("handleTelegramWebhookHttpRequest rejects missing, mismatched, and duplicated secret headers", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);
  const options = {
    runtime,
  };

  assert.deepEqual(
    await handleTelegramWebhookHttpRequest(
      {
        method: "POST",
        headers: {},
        body: telegramUpdate,
      },
      options,
    ),
    {
      statusCode: 401,
      body: { status: "unauthorized" },
    },
  );
  assert.deepEqual(
    await handleTelegramWebhookHttpRequest(
      {
        method: "POST",
        headers: {
          "x-telegram-bot-api-secret-token": "wrong-secret",
        },
        body: telegramUpdate,
      },
      options,
    ),
    {
      statusCode: 401,
      body: { status: "unauthorized" },
    },
  );
  assert.deepEqual(
    await handleTelegramWebhookHttpRequest(
      {
        method: "POST",
        headers: {
          "x-telegram-bot-api-secret-token": ["webhook-secret", "webhook-secret"],
        },
        body: telegramUpdate,
      },
      options,
    ),
    {
      statusCode: 401,
      body: { status: "unauthorized" },
    },
  );
  assert.equal(runtime.lastUpdate, null);
});

test("handleTelegramWebhookHttpRequest rejects non-POST methods before runtime processing", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);

  assert.deepEqual(
    await handleTelegramWebhookHttpRequest(
      {
        method: "GET",
        headers: {
          "x-telegram-bot-api-secret-token": "webhook-secret",
        },
        body: telegramUpdate,
      },
      {
        runtime,
      },
    ),
    {
      statusCode: 405,
      body: { status: "method_not_allowed" },
    },
  );
  assert.equal(runtime.lastUpdate, null);
});

test("handleTelegramWebhookHttpRequest maps runtime failures to retryable HTTP failures", async () => {
  const response = await handleTelegramWebhookHttpRequest(
    {
      method: "POST",
      headers: {
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
      body: telegramUpdate,
    },
    {
      runtime: new FailingTelegramBotRuntime(new Error("Runtime failed.")),
    },
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { status: "failed" });

  if (response.statusCode === 500) {
    assert.equal(response.result.status, "failed");
  }
});

class RecordingTelegramBotRuntime implements TelegramBotRuntime {
  lastUpdate: unknown | null = null;

  constructor(private readonly result: TelegramUpdateProcessorResult) {}

  async processUpdate(update: unknown): Promise<TelegramUpdateProcessorResult> {
    this.lastUpdate = update;

    return this.result;
  }

  verifyWebhook(request: IntegrationWebhookRequest): Promise<IntegrationWebhookVerificationResult> {
    return createTelegramWebhookHandler("webhook-secret").verify(request);
  }
}

class FailingTelegramBotRuntime implements TelegramBotRuntime {
  constructor(private readonly error: Error) {}

  async processUpdate(): Promise<TelegramUpdateProcessorResult> {
    throw this.error;
  }

  verifyWebhook(request: IntegrationWebhookRequest): Promise<IntegrationWebhookVerificationResult> {
    return createTelegramWebhookHandler("webhook-secret").verify(request);
  }
}
