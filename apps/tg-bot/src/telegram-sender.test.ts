import assert from "node:assert/strict";
import test from "node:test";
import type { TelegramReplyAction } from "./message-handler.js";
import {
  createTelegramConfirmationInlineKeyboard,
  createTelegramReplySender,
  type TelegramBotApiFetch,
  type TelegramBotApiFetchInit,
  TelegramReplySenderError,
} from "./telegram-sender.js";

const replyAction: TelegramReplyAction = {
  kind: "reply",
  telegramChatId: "-100987654321",
  replyToMessageId: "20",
  text: "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
};
const confirmationRequestId = "11111111-1111-4111-8111-111111111111";

test("TelegramReplySender posts reply actions through Telegram sendMessage", async () => {
  const fetch = new RecordingTelegramBotApiFetch({ ok: true, result: { message_id: 45 } });
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    apiBaseUrl: "https://telegram.example.test/",
    fetch: fetch.call,
  });

  assert.deepEqual(await sender.sendReply(replyAction), { messageId: "45" });
  assert.equal(
    fetch.lastInput,
    "https://telegram.example.test/bot123456:telegram-token/sendMessage",
  );
  assert.deepEqual(fetch.lastInit, {
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

test("TelegramReplySender sends non-threaded messages when reply message id is absent", async () => {
  const fetch = new RecordingTelegramBotApiFetch({ ok: true, result: { message_id: 46 } });
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: fetch.call,
  });

  assert.deepEqual(
    await sender.sendReply({
      kind: "reply",
      telegramChatId: "123456789",
      replyToMessageId: null,
      text: "Не смог прочитать сообщение Telegram.",
    }),
    { messageId: "46" },
  );
  assert.deepEqual(fetch.lastInit, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: "123456789",
      text: "Не смог прочитать сообщение Telegram.",
    }),
  });
});

test("TelegramReplySender serializes inline keyboard reply markup", async () => {
  const fetch = new RecordingTelegramBotApiFetch({ ok: true, result: { message_id: 48 } });
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: fetch.call,
  });

  assert.deepEqual(
    await sender.sendReply({
      ...replyAction,
      inlineKeyboard: createTelegramConfirmationInlineKeyboard(confirmationRequestId),
    }),
    { messageId: "48" },
  );
  assert.deepEqual(fetch.lastInit, {
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
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Подтвердить",
              callback_data: `task:confirmation:${confirmationRequestId}:confirm`,
            },
            {
              text: "Отменить",
              callback_data: `task:confirmation:${confirmationRequestId}:cancel`,
            },
          ],
        ],
      },
    }),
  });
});

test("createTelegramConfirmationInlineKeyboard validates confirmation identifiers", () => {
  assert.deepEqual(createTelegramConfirmationInlineKeyboard(confirmationRequestId), {
    rows: [
      [
        {
          text: "Подтвердить",
          callbackData: `task:confirmation:${confirmationRequestId}:confirm`,
        },
        {
          text: "Отменить",
          callbackData: `task:confirmation:${confirmationRequestId}:cancel`,
        },
      ],
    ],
  });
  assert.throws(
    () => createTelegramConfirmationInlineKeyboard("not-a-uuid"),
    TelegramReplySenderError,
  );
});

test("TelegramReplySender rejects reply actions without chat ids before calling Telegram", async () => {
  const fetch = new RecordingTelegramBotApiFetch({ ok: true, result: { message_id: 47 } });
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: fetch.call,
  });

  await assert.rejects(
    () =>
      sender.sendReply({
        kind: "reply",
        telegramChatId: null,
        replyToMessageId: null,
        text: "Не смог прочитать сообщение Telegram.",
      }),
    TelegramReplySenderError,
  );
  assert.equal(fetch.lastInput, null);
});

test("TelegramReplySender rejects invalid inline keyboard buttons before calling Telegram", async () => {
  const fetch = new RecordingTelegramBotApiFetch({ ok: true, result: { message_id: 49 } });
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: fetch.call,
  });

  await assert.rejects(
    () =>
      sender.sendReply({
        ...replyAction,
        inlineKeyboard: {
          rows: [
            [
              {
                text: "Подтвердить",
                callbackData: "",
              },
            ],
          ],
        },
      }),
    TelegramReplySenderError,
  );
  assert.equal(fetch.lastInput, null);
});

test("TelegramReplySender throws typed errors for non-2xx responses", async () => {
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: new RecordingTelegramBotApiFetch(
      { ok: false, description: "Unauthorized" },
      { ok: false, status: 401, statusText: "Unauthorized" },
    ).call,
  });

  await assert.rejects(() => sender.sendReply(replyAction), TelegramReplySenderError);
});

test("TelegramReplySender throws typed errors for unsuccessful Telegram responses", async () => {
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: new RecordingTelegramBotApiFetch({ ok: false, description: "Bad Request" }).call,
  });

  await assert.rejects(() => sender.sendReply(replyAction), TelegramReplySenderError);
});

test("TelegramReplySender throws typed errors for malformed Telegram responses", async () => {
  const sender = createTelegramReplySender({
    botToken: "123456:telegram-token",
    fetch: new RecordingTelegramBotApiFetch({ ok: true, result: {} }).call,
  });

  await assert.rejects(() => sender.sendReply(replyAction), TelegramReplySenderError);
});

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
