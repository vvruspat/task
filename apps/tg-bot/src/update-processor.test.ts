import assert from "node:assert/strict";
import test from "node:test";
import type {
  CompleteTelegramChatConnectionRequest,
  CreateTelegramAgentRunRequest,
  HandleTelegramConfirmationCallbackRequest,
  RecordTelegramChatMessageRequest,
  RecordTelegramChatMessageResponse,
  ResolveTelegramContextRequest,
  TelegramAgentRunIntakeResponse,
  TelegramBackendClient,
  TelegramBrowserConnectIntentResponse,
  TelegramChatConnectionResponse,
  TelegramConfirmationCallbackResponse,
  TelegramContextResolutionResponse,
} from "./backend-client.js";
import { TelegramBackendClientError } from "./backend-client.js";
import type { TelegramReplyAction } from "./message-handler.js";
import type { TelegramReplySender, TelegramSendMessageResult } from "./telegram-sender.js";
import { isTelegramAgentInvocation, processTelegramUpdate } from "./update-processor.js";

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

test("Telegram group invocation matches only the configured bot mention", () => {
  const message = {
    attachments: [],
    chat: { telegramChatId: "-100987654321", title: "Team", type: "supergroup" },
    entities: [{ length: 15, offset: 0, type: "mention", url: null }],
    messageId: "20",
    threadId: null,
    replyToMessageId: null,
    replyToSender: null,
    sender: {
      firstName: null,
      isBot: false,
      lastName: null,
      telegramId: "123456789",
      username: "alex",
    },
    text: "@task_agent_bot help",
    updateId: "10",
  };
  assert.equal(isTelegramAgentInvocation(message, "task_agent_bot"), true);
  assert.equal(isTelegramAgentInvocation(message, "another_bot"), false);
});

test("processTelegramUpdate sends reply actions through the reply sender", async () => {
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient: new BrowserConnectTelegramBackendClient(),
    replySender,
  });

  assert.deepEqual(result, {
    kind: "reply_sent",
    reply: {
      inlineKeyboard: {
        rows: [
          [
            {
              loginUrl: `https://task.example/telegram/connect/${"b".repeat(43)}`,
              text: "Подключить tAsk",
            },
          ],
        ],
      },
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "20",
      text: "Чтобы выполнить запрос, сначала подключи Telegram к аккаунту tAsk.",
    },
    sentMessage: { messageId: "45" },
  });
  assert.deepEqual(replySender.lastAction, {
    inlineKeyboard: {
      rows: [
        [
          {
            loginUrl: `https://task.example/telegram/connect/${"b".repeat(43)}`,
            text: "Подключить tAsk",
          },
        ],
      ],
    },
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Чтобы выполнить запрос, сначала подключи Telegram к аккаунту tAsk.",
  });
});

test("processTelegramUpdate handles a bare connect command even without an agent invocation", async () => {
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });
  const result = await processTelegramUpdate(
    {
      ...telegramUpdate,
      message: {
        ...telegramUpdate.message,
        entities: [{ type: "bot_command", offset: 0, length: 8 }],
        text: "/connect",
      },
    },
    {
      backendClient: new BrowserConnectTelegramBackendClient(),
      replySender,
    },
  );

  assert.equal(result.kind, "reply_sent");
  assert.deepEqual(replySender.lastAction?.inlineKeyboard, {
    rows: [
      [
        {
          loginUrl: `https://task.example/telegram/connect/${"b".repeat(43)}`,
          text: "Открыть tAsk",
        },
      ],
    ],
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
  pendingConfirmationRequests: [],
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
      telegramUsername: "alex",
      firstName: null,
      lastName: null,
    },
  });
  assert.deepEqual(backendClient.lastAgentRunRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
      telegramThreadId: null,
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

test("processTelegramUpdate ignores a duplicate update while its agent run is active", async () => {
  const runningAgentRunResponse: TelegramAgentRunIntakeResponse = {
    ...agentRunResponse,
    status: "running",
  };
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    runningAgentRunResponse,
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    replySender,
  });

  assert.deepEqual(result, {
    kind: "agent_run_in_progress",
    agentRun: runningAgentRunResponse,
  });
  assert.equal(replySender.lastAction, null);
});

test("processTelegramUpdate stores ordinary group messages without replying", async () => {
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
  const update = {
    ...telegramUpdate,
    message: { ...telegramUpdate.message, entities: [], text: "обычное сообщение" },
  };

  const result = await processTelegramUpdate(update, { backendClient, replySender });

  assert.deepEqual(result, {
    kind: "message_observed",
    recording: { status: "history_access_disabled" },
  });
  assert.equal(backendClient.lastAgentRunRequest, null);
  assert.equal(replySender.lastAction, null);
  assert.deepEqual(backendClient.lastRecordMessageRequest, {
    body: {
      telegramChatId: "-100987654321",
      telegramMessageId: "20",
      telegramThreadId: null,
      replyToTelegramMessageId: null,
      senderTelegramId: "123456789",
      senderDisplayName: "@alex",
      senderIsBot: false,
      text: "обычное сообщение",
      sentAt: null,
    },
  });
});

test("processTelegramUpdate does not block ordinary messages when history storage fails", async () => {
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    agentRunResponse,
    null,
    null,
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });
  const logger = new RecordingTelegramUpdateProcessorLogger();
  const update = {
    ...telegramUpdate,
    message: { ...telegramUpdate.message, entities: [], text: "обычное сообщение" },
  };

  const result = await processTelegramUpdate(update, { backendClient, logger, replySender });

  assert.deepEqual(result, { kind: "message_observed", recording: null });
  assert.equal(replySender.lastAction, null);
  assert.equal(logger.errors.length, 1);
  assert(logger.errors[0] instanceof TelegramBackendClientError);
});

test("processTelegramUpdate sends a generic reply for unexpected processing errors", async () => {
  const backendClient = new CrashingTelegramBackendClient();
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });
  const logger = new RecordingTelegramUpdateProcessorLogger();

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    logger,
    replySender,
  });

  assert.deepEqual(result, {
    kind: "reply_sent",
    reply: {
      kind: "reply",
      telegramChatId: "-100987654321",
      replyToMessageId: "20",
      text: "Не удалось обработать запрос из-за внутренней ошибки. Попробуй ещё раз позже.",
    },
    sentMessage: { messageId: "45" },
  });
  assert.equal(logger.errors.length, 1);
  const [loggedError] = logger.errors;
  assert(loggedError instanceof Error);
  assert.equal(loggedError.message, "Unexpected context failure.");
});

test("processTelegramUpdate attaches confirmation buttons for waiting agent runs", async () => {
  const waitingAgentRunResponse: TelegramAgentRunIntakeResponse = {
    ...agentRunResponse,
    status: "waiting_confirmation",
    responseText: "Нужно подтверждение.",
    pendingConfirmationRequests: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        kind: "task.create",
        preview: { title: "Записать бас" },
        expiresAt: "2026-07-08T01:00:00.000Z",
      },
    ],
  };
  const backendClient = new RecordingTelegramBackendClient(
    {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    },
    waitingAgentRunResponse,
  );
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    replySender,
  });

  assert.equal(result.kind, "agent_run_reply_sent");
  assert.deepEqual(replySender.lastAction, {
    kind: "reply",
    telegramChatId: "-100987654321",
    replyToMessageId: "20",
    text: "Нужно подтверждение.",
    inlineKeyboard: {
      rows: [
        [
          {
            text: "Подтвердить",
            callbackData: "task:confirmation:11111111-1111-4111-8111-111111111111:confirm",
          },
          {
            text: "Отменить",
            callbackData: "task:confirmation:11111111-1111-4111-8111-111111111111:cancel",
          },
        ],
      ],
    },
  });
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
  lastRecordMessageRequest: RecordTelegramChatMessageRequest | null = null;

  constructor(
    private readonly response: TelegramContextResolutionResponse,
    private readonly agentRunResponse: TelegramAgentRunIntakeResponse | null = null,
    private readonly confirmationCallbackResponse: TelegramConfirmationCallbackResponse | null = null,
    private readonly recordMessageResponse: RecordTelegramChatMessageResponse | null = {
      status: "history_access_disabled",
    },
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

  async completeTelegramChatConnection(
    _request: CompleteTelegramChatConnectionRequest,
  ): Promise<TelegramChatConnectionResponse> {
    throw new TelegramBackendClientError("Unexpected Telegram connection request.");
  }

  async createTelegramBrowserConnectIntent(): Promise<TelegramBrowserConnectIntentResponse> {
    throw new TelegramBackendClientError("Unexpected Telegram browser connection request.");
  }

  async recordTelegramChatMessage(
    request: RecordTelegramChatMessageRequest,
  ): Promise<RecordTelegramChatMessageResponse> {
    this.lastRecordMessageRequest = request;
    if (this.recordMessageResponse === null) {
      throw new TelegramBackendClientError("Telegram history storage unavailable.");
    }
    return this.recordMessageResponse;
  }
}

class CrashingTelegramBackendClient extends RecordingTelegramBackendClient {
  constructor() {
    super({ status: "telegram_user_unlinked" });
  }

  override async resolveTelegramContext(
    _request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse> {
    throw new Error("Unexpected context failure.");
  }
}

class BrowserConnectTelegramBackendClient extends RecordingTelegramBackendClient {
  constructor() {
    super({ status: "telegram_user_unlinked" });
  }

  override async createTelegramBrowserConnectIntent(): Promise<TelegramBrowserConnectIntentResponse> {
    return {
      expiresAt: "2026-08-09T19:00:00.000Z",
      loginUrl: `https://task.example/telegram/connect/${"b".repeat(43)}`,
    };
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

class RecordingTelegramUpdateProcessorLogger {
  readonly errors: unknown[] = [];

  error(error: unknown): void {
    this.errors.push(error);
  }
}
