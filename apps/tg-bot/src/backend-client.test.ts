import assert from "node:assert/strict";
import test from "node:test";
import {
  createTelegramBackendClient,
  TelegramBackendClientError,
  type TelegramBackendFetch,
  type TelegramBackendFetchInit,
} from "./backend-client.js";

const requestBody = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
};

test("TelegramBackendClient posts Telegram context with bot shared secret", async () => {
  const fetch = new RecordingTelegramBackendFetch({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test/",
    botSharedSecret: "bot-secret",
    fetch: fetch.call,
  });

  assert.deepEqual(await client.resolveTelegramContext({ body: requestBody }), {
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  assert.equal(fetch.lastInput, "https://api.example.test/internal/telegram/context/resolve");
  assert.deepEqual(fetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": "bot-secret",
    },
    body: JSON.stringify(requestBody),
  });
});

test("TelegramBackendClient parses explicit unlinked states", async () => {
  const unlinkedUserClient = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch({ status: "telegram_user_unlinked" }).call,
  });
  const unlinkedChatClient = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch({
      status: "telegram_chat_unlinked",
      userId: "22222222-2222-4222-8222-222222222222",
    }).call,
  });

  assert.deepEqual(await unlinkedUserClient.resolveTelegramContext({ body: requestBody }), {
    status: "telegram_user_unlinked",
  });
  assert.deepEqual(await unlinkedChatClient.resolveTelegramContext({ body: requestBody }), {
    status: "telegram_chat_unlinked",
    userId: "22222222-2222-4222-8222-222222222222",
  });
});

test("TelegramBackendClient throws typed errors for non-2xx responses", async () => {
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch(
      { status: "telegram_user_unlinked" },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ).call,
  });

  await assert.rejects(
    () => client.resolveTelegramContext({ body: requestBody }),
    TelegramBackendClientError,
  );
});

test("TelegramBackendClient throws typed errors for malformed JSON responses", async () => {
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch({ status: "resolved" }).call,
  });

  await assert.rejects(
    () => client.resolveTelegramContext({ body: requestBody }),
    TelegramBackendClientError,
  );
});

class RecordingTelegramBackendFetch {
  lastInput: string | null = null;
  lastInit: TelegramBackendFetchInit | null = null;

  constructor(
    private readonly jsonBody: unknown,
    private readonly response: { ok: boolean; status: number; statusText: string } = {
      ok: true,
      status: 200,
      statusText: "OK",
    },
  ) {}

  readonly call: TelegramBackendFetch = async (input, init) => {
    this.lastInput = input;
    this.lastInit = init;

    return {
      ...this.response,
      json: async () => this.jsonBody,
    };
  };
}
