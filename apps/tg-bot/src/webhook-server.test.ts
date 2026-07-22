import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import type {
  IntegrationWebhookRequest,
  IntegrationWebhookVerificationResult,
} from "@task/integration-sdk";
import { createTelegramWebhookHandler } from "@task/integration-telegram";
import type { TelegramBotRuntime } from "./runtime.js";
import type { TelegramUpdateProcessorResult } from "./update-processor.js";
import { createTelegramWebhookServer } from "./webhook-server.js";

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

test("createTelegramWebhookServer handles authorized Telegram webhook requests", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);
  const server = createTelegramWebhookServer({
    runtime,
  });

  const runningServer = await startServer(server);

  try {
    const response = await fetch(runningServer.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
      body: JSON.stringify(telegramUpdate),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "accepted" });
    assert.deepEqual(runtime.lastUpdate, telegramUpdate);
  } finally {
    await closeServer(server);
  }
});

test("createTelegramWebhookServer rejects non-POST requests before runtime processing", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);
  const server = createTelegramWebhookServer({
    runtime,
  });

  const runningServer = await startServer(server);

  try {
    const response = await fetch(runningServer.url, {
      method: "GET",
      headers: {
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
    });

    assert.equal(response.status, 405);
    assert.deepEqual(await response.json(), { status: "method_not_allowed" });
    assert.equal(runtime.lastUpdate, null);
  } finally {
    await closeServer(server);
  }
});

test("createTelegramWebhookServer rejects malformed JSON bodies", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);
  const server = createTelegramWebhookServer({
    runtime,
  });

  const runningServer = await startServer(server);

  try {
    const response = await fetch(runningServer.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
      body: "{",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: "bad_request" });
    assert.equal(runtime.lastUpdate, null);
  } finally {
    await closeServer(server);
  }
});

test("createTelegramWebhookServer rejects oversized JSON bodies", async () => {
  const runtime = new RecordingTelegramBotRuntime(replySentResult);
  const server = createTelegramWebhookServer({
    runtime,
    maxBodyBytes: 8,
  });

  const runningServer = await startServer(server);

  try {
    const response = await fetch(runningServer.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
      body: JSON.stringify(telegramUpdate),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { status: "bad_request" });
    assert.equal(runtime.lastUpdate, null);
  } finally {
    await closeServer(server);
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

type RunningServer = {
  url: string;
};

function startServer(server: Server): Promise<RunningServer> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, () => {
      server.off("error", reject);
      const address = server.address();

      if (address === null || typeof address === "string") {
        reject(new Error("Expected webhook test server to listen on a TCP port."));
        return;
      }

      resolve({
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error?: Error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
