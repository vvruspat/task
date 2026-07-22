import assert from "node:assert/strict";
import test from "node:test";
import {
  type CompleteTelegramChatConnectionRequest,
  type HandleTelegramConfirmationCallbackRequest,
  type ResolveTelegramContextRequest,
  type TelegramAgentRunIntakeResponse,
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramChatConnectionResponse,
  type TelegramConfirmationCallbackResponse,
  type TelegramContextResolutionResponse,
} from "./backend-client.js";
import { handleTelegramUpdate } from "./message-handler.js";

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
    text: "создай задачу записать бас",
  },
};

test("handleTelegramUpdate resolves Telegram context with stable identifiers", async () => {
  const backendClient = new RecordingTelegramBackendClient({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });

  const action = await handleTelegramUpdate(telegramUpdate, { backendClient });

  assert.equal(action.kind, "resolved");
  assert.deepEqual(backendClient.lastRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    },
  });

  if (action.kind === "resolved") {
    assert.equal(action.message.sender.username, "alex");
    assert.deepEqual(action.context, {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    });
  }
});

test("handleTelegramUpdate replies when the Telegram user is unlinked", async () => {
  const action = await handleTelegramUpdate(telegramUpdate, {
    backendClient: new RecordingTelegramBackendClient({ status: "telegram_user_unlinked" }),
  });

  assert.deepEqual(action, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
  });
});

test("handleTelegramUpdate replies when the Telegram chat is unlinked", async () => {
  const action = await handleTelegramUpdate(telegramUpdate, {
    backendClient: new RecordingTelegramBackendClient({
      status: "telegram_chat_unlinked",
      userId: "22222222-2222-4222-8222-222222222222",
    }),
  });

  assert.deepEqual(action, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Этот чат ещё не привязан к workspace tAsk. Попроси администратора привязать чат.",
  });
});

test("handleTelegramUpdate replies when the user is outside the chat workspace", async () => {
  const action = await handleTelegramUpdate(telegramUpdate, {
    backendClient: new RecordingTelegramBackendClient({
      status: "user_not_in_chat_workspace",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
    }),
  });

  assert.deepEqual(action, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Ты не состоишь в workspace, к которому привязан этот чат.",
  });
});

test("handleTelegramUpdate replies for malformed Telegram updates", async () => {
  const action = await handleTelegramUpdate(
    { update_id: 10 },
    {
      backendClient: new RecordingTelegramBackendClient({ status: "telegram_user_unlinked" }),
    },
  );

  assert.deepEqual(action, {
    kind: "reply",
    telegramChatId: null,
    replyToMessageId: null,
    text: "Не смог прочитать сообщение Telegram.",
  });
});

test("handleTelegramUpdate replies for backend client failures", async () => {
  const action = await handleTelegramUpdate(telegramUpdate, {
    backendClient: new FailingTelegramBackendClient(),
  });

  assert.deepEqual(action, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Сейчас не удалось проверить доступ в tAsk. Попробуй позже.",
  });
});

test("handleTelegramUpdate connects an unlinked chat with a one-time command", async () => {
  const backendClient = new RecordingTelegramBackendClient(
    { status: "telegram_chat_unlinked", userId: "11111111-1111-4111-8111-111111111111" },
    {
      integrationId: "22222222-2222-4222-8222-222222222222",
      status: "connected",
      telegramChatId: "-100987654321",
      workspaceId: "33333333-3333-4333-8333-333333333333",
    },
  );
  const token = "a".repeat(43);
  const action = await handleTelegramUpdate(
    { ...telegramUpdate, message: { ...telegramUpdate.message, text: `/connect ${token}` } },
    { backendClient },
  );

  assert.deepEqual(action, {
    kind: "reply",
    replyToMessageId: "20",
    telegramChatId: "-100987654321",
    text: "Чат подключён к workspace tAsk.",
  });
  assert.deepEqual(backendClient.lastConnectionRequest, {
    body: {
      telegramChatId: "-100987654321",
      telegramId: "123456789",
      title: "Album Team",
      token,
    },
  });
  assert.equal(backendClient.lastRequest, null);
});

class RecordingTelegramBackendClient implements TelegramBackendClient {
  lastRequest: ResolveTelegramContextRequest | null = null;
  lastConnectionRequest: CompleteTelegramChatConnectionRequest | null = null;

  constructor(
    private readonly response: TelegramContextResolutionResponse,
    private readonly connectionResponse: TelegramChatConnectionResponse | null = null,
  ) {}

  async resolveTelegramContext(
    request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse> {
    this.lastRequest = request;

    return this.response;
  }

  async createTelegramAgentRun(): Promise<TelegramAgentRunIntakeResponse> {
    throw new TelegramBackendClientError("Unexpected agent intake request.");
  }

  async handleTelegramConfirmationCallback(
    _request: HandleTelegramConfirmationCallbackRequest,
  ): Promise<TelegramConfirmationCallbackResponse> {
    throw new TelegramBackendClientError("Unexpected confirmation callback request.");
  }

  async completeTelegramChatConnection(
    request: CompleteTelegramChatConnectionRequest,
  ): Promise<TelegramChatConnectionResponse> {
    this.lastConnectionRequest = request;
    if (this.connectionResponse === null) {
      throw new TelegramBackendClientError("Unexpected Telegram connection request.");
    }
    return this.connectionResponse;
  }
}

class FailingTelegramBackendClient implements TelegramBackendClient {
  async resolveTelegramContext(): Promise<TelegramContextResolutionResponse> {
    throw new TelegramBackendClientError("Backend unavailable.");
  }

  async createTelegramAgentRun(): Promise<TelegramAgentRunIntakeResponse> {
    throw new TelegramBackendClientError("Backend unavailable.");
  }

  async handleTelegramConfirmationCallback(): Promise<TelegramConfirmationCallbackResponse> {
    throw new TelegramBackendClientError("Backend unavailable.");
  }

  async completeTelegramChatConnection(): Promise<TelegramChatConnectionResponse> {
    throw new TelegramBackendClientError("Backend unavailable.");
  }
}
