import assert from "node:assert/strict";
import test from "node:test";
import {
  type CreateTelegramAgentRunInput,
  createTelegramBackendClient,
  TelegramBackendClientError,
  type TelegramBackendFetch,
  type TelegramBackendFetchInit,
  type TelegramConfirmationCallbackInput,
} from "./backend-client.js";

const requestBody = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
};
const agentRunRequestBody: CreateTelegramAgentRunInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  sourceMessageId: "42",
  inputText: "@task what is next?",
  attachments: [
    {
      kind: "photo",
      fileId: "photo-file-id",
      fileUniqueId: "photo-unique-id",
      width: 1280,
      height: 720,
      sizeBytes: "2048",
    },
  ],
};
const confirmationCallbackRequestBody: TelegramConfirmationCallbackInput = {
  telegramId: "123456789",
  telegramChatId: "-100987654321",
  confirmationRequestId: "11111111-1111-4111-8111-111111111111",
  action: "confirm",
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

test("TelegramBackendClient completes Telegram chat connections with bot shared secret", async () => {
  const fetch = new RecordingTelegramBackendFetch({
    integrationId: "11111111-1111-4111-8111-111111111111",
    status: "connected",
    telegramChatId: "-100987654321",
    workspaceId: "33333333-3333-4333-8333-333333333333",
  });
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test/",
    botSharedSecret: "bot-secret",
    fetch: fetch.call,
  });
  const body = {
    telegramChatId: "-100987654321",
    telegramId: "123456789",
    title: "Album Team",
    token: "a".repeat(43),
  };

  assert.equal((await client.completeTelegramChatConnection({ body })).status, "connected");
  assert.equal(fetch.lastInput, "https://api.example.test/internal/integrations/telegram/connect");
  assert.equal(fetch.lastInit?.body, JSON.stringify(body));
});

test("TelegramBackendClient posts Telegram agent runs with bot shared secret", async () => {
  const fetch = new RecordingTelegramBackendFetch({
    agentRunId: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceMessageId: "42",
    status: "completed",
    responseText: "Request recorded. Agent execution is not connected yet.",
    pendingConfirmationRequests: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        kind: "task.create",
        preview: { title: "Записать бас" },
        expiresAt: "2026-07-08T01:00:00.000Z",
      },
    ],
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test/",
    botSharedSecret: "bot-secret",
    fetch: fetch.call,
  });

  assert.deepEqual(await client.createTelegramAgentRun({ body: agentRunRequestBody }), {
    agentRunId: "11111111-1111-4111-8111-111111111111",
    workspaceId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    source: "telegram",
    sourceMessageId: "42",
    status: "completed",
    responseText: "Request recorded. Agent execution is not connected yet.",
    pendingConfirmationRequests: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        kind: "task.create",
        preview: { title: "Записать бас" },
        expiresAt: "2026-07-08T01:00:00.000Z",
      },
    ],
    createdAt: "2026-07-08T00:00:00.000Z",
  });
  assert.equal(fetch.lastInput, "https://api.example.test/internal/agent/telegram/runs");
  assert.deepEqual(fetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": "bot-secret",
    },
    body: JSON.stringify(agentRunRequestBody),
  });
});

test("TelegramBackendClient posts Telegram confirmation callbacks with bot shared secret", async () => {
  const fetch = new RecordingTelegramBackendFetch({
    confirmationRequestId: "11111111-1111-4111-8111-111111111111",
    action: "confirm",
    status: "confirmed",
  });
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test/",
    botSharedSecret: "bot-secret",
    fetch: fetch.call,
  });

  assert.deepEqual(
    await client.handleTelegramConfirmationCallback({ body: confirmationCallbackRequestBody }),
    {
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
      status: "confirmed",
    },
  );
  assert.equal(
    fetch.lastInput,
    "https://api.example.test/internal/telegram/confirmations/callback",
  );
  assert.deepEqual(fetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-task-bot-secret": "bot-secret",
    },
    body: JSON.stringify(confirmationCallbackRequestBody),
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

test("TelegramBackendClient throws typed errors for agent intake non-2xx responses", async () => {
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch(
      { status: "failed" },
      { ok: false, status: 404, statusText: "Not Found" },
    ).call,
  });

  await assert.rejects(
    () => client.createTelegramAgentRun({ body: agentRunRequestBody }),
    TelegramBackendClientError,
  );
});

test("TelegramBackendClient throws typed errors for confirmation callback non-2xx responses", async () => {
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch(
      { status: "failed" },
      { ok: false, status: 403, statusText: "Forbidden" },
    ).call,
  });

  await assert.rejects(
    () => client.handleTelegramConfirmationCallback({ body: confirmationCallbackRequestBody }),
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

test("TelegramBackendClient throws typed errors for malformed agent intake responses", async () => {
  const client = createTelegramBackendClient({
    baseUrl: "https://api.example.test",
    botSharedSecret: "bot-secret",
    fetch: new RecordingTelegramBackendFetch({
      agentRunId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      userId: "33333333-3333-4333-8333-333333333333",
      source: "telegram",
      sourceMessageId: "42",
      status: "unknown",
      responseText: "Request recorded. Agent execution is not connected yet.",
      pendingConfirmationRequests: [],
      createdAt: "2026-07-08T00:00:00.000Z",
    }).call,
  });

  await assert.rejects(
    () => client.createTelegramAgentRun({ body: agentRunRequestBody }),
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
