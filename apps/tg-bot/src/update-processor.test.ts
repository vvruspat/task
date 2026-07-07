import assert from "node:assert/strict";
import test from "node:test";
import type {
  ResolveTelegramContextRequest,
  TelegramBackendClient,
  TelegramContextResolutionResponse,
} from "./backend-client.js";
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

test("processTelegramUpdate returns resolved actions without sending Telegram replies", async () => {
  const backendClient = new RecordingTelegramBackendClient({
    status: "resolved",
    userId: "22222222-2222-4222-8222-222222222222",
    workspaceId: "33333333-3333-4333-8333-333333333333",
    defaultProjectId: null,
  });
  const replySender = new RecordingTelegramReplySender({ messageId: "45" });

  const result = await processTelegramUpdate(telegramUpdate, {
    backendClient,
    replySender,
  });

  assert.equal(result.kind, "resolved");
  assert.deepEqual(backendClient.lastRequest, {
    body: {
      telegramId: "123456789",
      telegramChatId: "-100987654321",
    },
  });
  assert.equal(replySender.lastAction, null);

  if (result.kind === "resolved") {
    assert.equal(result.message.text, "создай задачу записать бас");
    assert.deepEqual(result.context, {
      status: "resolved",
      userId: "22222222-2222-4222-8222-222222222222",
      workspaceId: "33333333-3333-4333-8333-333333333333",
      defaultProjectId: null,
    });
  }
});

class RecordingTelegramBackendClient implements TelegramBackendClient {
  lastRequest: ResolveTelegramContextRequest | null = null;

  constructor(private readonly response: TelegramContextResolutionResponse) {}

  async resolveTelegramContext(
    request: ResolveTelegramContextRequest,
  ): Promise<TelegramContextResolutionResponse> {
    this.lastRequest = request;

    return this.response;
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
