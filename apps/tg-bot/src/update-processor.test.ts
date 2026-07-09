import assert from "node:assert/strict";
import test from "node:test";
import type {
  CreateTelegramAgentRunRequest,
  HandleTelegramConfirmationCallbackRequest,
  ResolveTelegramContextRequest,
  TelegramAgentRunIntakeResponse,
  TelegramBackendClient,
  TelegramConfirmationCallbackResponse,
  TelegramContextResolutionResponse,
} from "./backend-client.js";
import { TelegramBackendClientError } from "./backend-client.js";
import type { TelegramReplyAction } from "./message-handler.js";
import type { TelegramReplySender, TelegramSendMessageResult } from "./telegram-sender.js";
import { processTelegramUpdate } from "./update-processor.js";

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
    document: {
      file_id: "document-file-id",
      file_unique_id: "document-unique-id",
      file_name: "chart.pdf",
      mime_type: "application/pdf",
      file_size: 1024,
    },
  },
};
const telegramConfirmationCallbackUpdate = {
  update_id: 11,
  callback_query: {
    id: "callback-1",
    from: {
      id: 123456789,
      is_bot: false,
      username: "alex",
    },
    message: {
      message_id: 21,
      chat: {
        id: -100987654321,
        type: "supergroup",
        title: "Album Team",
      },
    },
    data: "task:confirmation:11111111-1111-4111-8111-111111111111:confirm",
  },
};

test("processTelegramUpdate sends reply actions through the reply sender", async () => {
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient: new RecordingTelegramBackendClient({ status: "telegram_user_unlinked" }),
    replySender,
  });

  assert.deepEqual(result, {
    kind: "reply_sent",
    reply: {
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "20",
      text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
    },
    sentMessage: { messageId: "45" },
  });
  assert.deepEqual(replySender.lastAction, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
  });
});

const agentRunResponse: TelegramAgentRunIntakeResponse = {
  agentRunId: "11111111-1111-4111-8111-111111111111",
  workspaceId: "33333333-3333-4333-8333-333333333333",
  userId: "22222222-2222-4222-8222-222222222222",
  source: "telegram",
  sourceMessageId: "20",
  status: "completed",
  responseText: "Request recorded. Agent execution is not connected yet.",
  createdAt: "2026-07-08T00:00:00.000Z",
};

test("processTelegramUpdate records resolved commands and replies with agent response text", async () => {
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    agentRunResponse,
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    replySender,
  });

  assert.equal(result.kind, "agent_run_reply_sent");
  assert.deepEqual(backendClient.lastRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    },
  });
  assert.deepEqual(backendClient.lastAgentRunRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      sourceMessageId: "20",
      inputText: "создай задачу записать бас",
      attachments: [
        {
          kind: "document",
          fileId: "document-file-id",
          fileUniqueId: "document-unique-id",
          fileName: "chart.pdf",
          mimeType: "application/pdf",
          sizeBytes: "1024",
        },
      ],
    },
  });
  assert.deepEqual(replySender.lastAction, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Request recorded. Agent execution is not connected yet.",
  });

  if (result.kind === "agent_run_reply_sent") {
    assert.deepEqual(result.agentRun, agentRunResponse);
    assert.deepEqual(result.sentMessage, { messageId: "45" });
  }
});

test("processTelegramUpdate applies confirmation callbacks and replies with the result", async () => {
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    agentRunResponse,
    {
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
      status: "confirmed",
    },
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "46" });

  const result = await processTelegramUpdate(telegramConfirmationCallbackUpdate, {
    backendClient,
    replySender,
  });

  assert.equal(result.kind, "confirmation_callback_reply_sent");
  assert.equal(backendClient.lastRequest, null);
  assert.equal(backendClient.lastAgentRunRequest, null);
  assert.deepEqual(backendClient.lastConfirmationCallbackRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
    },
  });
  assert.deepEqual(replySender.lastAction, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "21",
    text: "Подтверждено.",
  });

  if (result.kind === "confirmation_callback_reply_sent") {
    assert.deepEqual(result.callback, {
      confirmationRequestId: "11111111-1111-4111-8111-111111111111",
      action: "confirm",
      status: "confirmed",
    });
    assert.deepEqual(result.sentMessage, { messageId: "46" });
  }
});

test("processTelegramUpdate does not call the backend for malformed confirmation callbacks", async () => {
  const backendClient = new RecordingTelegramBackendClient({
    status: "telegram_user_unlinked",
  });
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(
    {
      update_id: 11,
      callback_query: {
        id: "callback-1",
        from: { id: 123456789, is_bot: false },
        message: {
          message_id: 21,
          chat: { id: -100987654321, type: "supergroup" },
        },
        data: "task:confirmation:not-a-uuid:confirm",
      },
    },
    {
      backendClient,
      replySender,
    },
  );

  assert.deepEqual(result, {
    kind: "reply_sent",
    reply: {
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "21",
      text: "Не смог обработать подтверждение.",
    },
    sentMessage: { messageId: "45" },
  });
  assert.equal(backendClient.lastConfirmationCallbackRequest, null);
});

test("processTelegramUpdate replies when agent intake fails", async () => {
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    null,
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    replySender,
  });

  assert.deepEqual(result, {
    kind: "reply_sent",
    reply: {
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "20",
      text: "Сейчас не удалось отправить запрос агенту tAsk. Попробуй позже.",
    },
    sentMessage: { messageId: "45" },
  });
});

class RecordingTelegramBackendClient implements TelegramBackendClient {
  lastRequest: ResolveTelegramContextRequest | null = null;
  lastAgentRunRequest: CreateTelegramAgentRunRequest | null = null;
  lastConfirmationCallbackRequest: HandleTelegramConfirmationCallbackRequest | null = null;

  constructor(
    private readonly response: TelegramContextResolutionResponse,
    private readonly agentRunResponse: TelegramAgentRunIntakeResponse | null = null,
    private readonly confirmationCallbackResponse: TelegramConfirmationCallbackResponse | null = null,
  ) {}

  async resolveTelegramContext(
    request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse> {
    this.lastRequest = request;

    return this.response;
  }

  async createTelegramAgentRun(
    request: CreateTelegramAgentRunRequest,
  ): Promise<TelegramAgentRunIntakeResponse> {
    this.lastAgentRunRequest = request;

    if (this.agentRunResponse === null) {
      throw new TelegramBackendClientError("Agent intake unavailable.");
    }

    return this.agentRunResponse;
  }

  async handleTelegramConfirmationCallback(
    request: HandleTelegramConfirmationCallbackRequest,
  ): Promise<TelegramConfirmationCallbackResponse> {
    this.lastConfirmationCallbackRequest = request;

    if (this.confirmationCallbackResponse === null) {
      throw new TelegramBackendClientError("Confirmation callback unavailable.");
    }

    return this.confirmationCallbackResponse;
  }
}

class RecordingTelegramReplySender implements TelegramReplySender {
  lastAction: TelegramReplyAction | null = null;

  constructor(private readonly result: TelegramSendMessageResult) {}

  async sendReply(action: TelegramReplyAction): Promise<TelegramSendMessageResult> {
    this.lastAction = action;

    return this.result;
  }
}
