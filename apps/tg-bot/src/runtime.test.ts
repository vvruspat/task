import assert from "node:assert/strict";
import test from "node:test";
import type { TelegramBackendFetch, TelegramBackendFetchInit } from "./backend-client.js";
import { createTelegramBotRuntimeFromEnvironment } from "./runtime.js";
import type { TelegramBotApiFetch, TelegramBotApiFetchInit } from "./telegram-sender.js";

const telegramUpdate = {
  update_id: 10,
  message: {
    message_id: 20,
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
    text: "/task создай задачу записать бас",
    entities: [{ type: "bot_command", offset: 0, length: 5 }],
  },
};

const environment = {
  TELEGRAM_BOT_TOKEN: "123456:telegram-token",
  TASK_API_BOT_SHARED_SECRET: "bot-secret",
  TASK_API_BASE_URL: "https://api.example.test/",
};

test("createTelegramBotRuntimeFromEnvironment wires backend and Telegram clients", async () => {
  const backendFetch = new RecordingTelegramBackendFetch({ status: "telegram_user_unlinked" });
  const telegramFetch = new RecordingTelegramBotApiFetch({
    ok: true,
    result: { message_id: 45 },
  });

  const runtime = createTelegramBotRuntimeFromEnvironment({
    environment,
    backendFetch: backendFetch.call,
    telegramFetch: telegramFetch.call,
  });

  assert.deepEqual(await runtime.processUpdate(telegramUpdate), {
    kind: "reply_sent",
    reply: {
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "20",
      text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
    },
    sentMessage: { messageId: "45" },
  });
  assert.equal(
    backendFetch.lastInput,
    "https://api.example.test/internal/telegram/context/resolve",
  );
  assert.deepEqual(backendFetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": "bot-secret",
    },
    body: JSON.stringify({
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    }),
  });
  assert.equal(
    telegramFetch.lastInput,
    "https://api.telegram.org/bot123456:telegram-token/sendMessage",
  );
  assert.deepEqual(telegramFetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: "-100987654321",
      text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
      reply_parameters: {
        message_id: 20,
        allow_sending_without_reply: true,
      },
    }),
  });
});

test("createTelegramBotRuntimeFromEnvironment records resolved updates through agent intake", async () => {
  const backendFetch = new RecordingTelegramBackendFetch([
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      userId: "22222222-2222-4222-8222-222222222222",
      source: "telegram",
      sourceMessageId: "20",
      status: "completed",
      responseText: "Request recorded. Agent execution is not connected yet.",
      pendingConfirmationRequests: [],
      createdAt: "2026-07-08T00:00:00.000Z",
    },
  ]);
  const telegramFetch = new RecordingTelegramBotApiFetch({
    ok: true,
    result: { message_id: 45 },
  });

  const runtime = createTelegramBotRuntimeFromEnvironment({
    environment,
    backendFetch: backendFetch.call,
    telegramFetch: telegramFetch.call,
  });

  const result = await runtime.processUpdate(telegramUpdate);

  assert.equal(result.kind, "agent_run_reply_sent");
  assert.deepEqual(
    backendFetch.calls.map((call) => call.input),
    [
      "https://api.example.test/internal/telegram/context/resolve",
      "https://api.example.test/internal/agent/telegram/runs",
    ],
  );
  assert.deepEqual(backendFetch.calls[1]?.init, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": "bot-secret",
    },
    body: JSON.stringify({
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      sourceMessageId: "20",
      inputText: "/task создай задачу записать бас",
      attachments: [],
    }),
  });
  assert.equal(
    telegramFetch.lastInput,
    "https://api.telegram.org/bot123456:telegram-token/sendMessage",
  );
  assert.deepEqual(telegramFetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: "-100987654321",
      text: "Request recorded. Agent execution is not connected yet.",
      reply_parameters: {
        message_id: 20,
        allow_sending_without_reply: true,
      },
    }),
  });

  if (result.kind === "agent_run_reply_sent") {
    assert.deepEqual(result.agentRun, {
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      userId: "22222222-2222-4222-8222-222222222222",
      source: "telegram",
      sourceMessageId: "20",
      status: "completed",
      responseText: "Request recorded. Agent execution is not connected yet.",
      pendingConfirmationRequests: [],
      createdAt: "2026-07-08T00:00:00.000Z",
    });
  }
});

class RecordingTelegramBackendFetch {
  lastInput: string | null = null;
  lastInit: TelegramBackendFetchInit | null = null;
  readonly calls: { input: string; init: TelegramBackendFetchInit }[] = [];
  private readonly jsonBodies: unknown[];

  constructor(
    jsonBody: unknown | readonly unknown[],
    private readonly response: { ok: boolean; status: number; statusText: string } = {
      ok: true,
      status: 200,
      statusText: "OK",
    },
  ) {
    this.jsonBodies = Array.isArray(jsonBody) ? [...jsonBody] : [jsonBody];
  }

  readonly call: TelegramBackendFetch = async (input, init) => {
    this.lastInput = input;
    this.lastInit = init;
    this.calls.push({ input, init });
    const jsonBody = this.jsonBodies.length > 1 ? this.jsonBodies.shift() : this.jsonBodies[0];

    return {
      ...this.response,
      json: async () => jsonBody,
    };
  };
}

class RecordingTelegramBotApiFetch {
  lastInput: string | null = null;
  lastInit: TelegramBotApiFetchInit | null = null;

  constructor(
    private readonly jsonBody: unknown,
    private readonly response: { ok: boolean; status: number; statusText: string } = {
      ok: true,
      status: 200,
      statusText: "OK",
    },
  ) {}

  readonly call: TelegramBotApiFetch = async (input, init) => {
    this.lastInput = input;
    this.lastInit = init;

    return {
      ...this.response,
      json: async () => this.jsonBody,
    };
  };
}
