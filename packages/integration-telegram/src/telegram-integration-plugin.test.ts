import assert from "node:assert/strict";
import test from "node:test";
import { createTelegramIntegrationPlugin } from "./telegram-integration-plugin.js";

const plugin = createTelegramIntegrationPlugin({
  botUsername: "task_agent_bot",
  webhookSecret: "webhook-secret",
});

test("Telegram plugin binds declared webhook and conversation ingress handlers", () => {
  assert.deepEqual(
    plugin.manifest.capabilities.map((capability) => capability.kind),
    ["conversation_ingress", "webhook_handler"],
  );
  assert.equal(typeof plugin.handlers.webhook.verify, "function");
  assert.equal(typeof plugin.handlers.conversationIngress.normalize, "function");
});

test("Telegram webhook handler authenticates one case-insensitive secret header", async () => {
  const payload = { update_id: 10 };
  assert.deepEqual(
    await plugin.handlers.webhook.verify({
      headers: { "X-Telegram-Bot-Api-Secret-Token": "webhook-secret" },
      payload,
    }),
    { payload, status: "accepted" },
  );
  assert.deepEqual(
    await plugin.handlers.webhook.verify({
      headers: {
        "X-Telegram-Bot-Api-Secret-Token": "webhook-secret",
        "x-telegram-bot-api-secret-token": "webhook-secret",
      },
      payload,
    }),
    { status: "unauthorized" },
  );
  assert.deepEqual(await plugin.handlers.webhook.verify({ headers: {}, payload }), {
    status: "unauthorized",
  });
});

test("Telegram conversation ingress normalizes an addressed group message once", async () => {
  const event = await plugin.handlers.conversationIngress.normalize({
    update_id: 10,
    message: {
      message_id: 20,
      from: { id: 123456789, is_bot: false, username: "alex" },
      chat: { id: -100987654321, type: "supergroup", title: "Album Team" },
      text: "@task_agent_bot help",
      entities: [{ length: 15, offset: 0, type: "mention" }],
    },
  });

  assert.equal(event.kind, "message");
  if (event.kind !== "message") return;
  assert.equal(event.invokesAgent, true);
  assert.equal(event.message.sender.telegramId, "123456789");
  assert.equal(event.message.chat.telegramChatId, "-100987654321");
});

test("Telegram conversation ingress keeps a reply target for malformed callbacks", async () => {
  const event = await plugin.handlers.conversationIngress.normalize({
    update_id: 11,
    callback_query: {
      data: "task:confirmation:not-a-uuid:confirm",
      from: { id: 123456789, is_bot: false },
      id: "callback-1",
      message: {
        chat: { id: -100987654321, type: "supergroup" },
        message_id: 21,
      },
    },
  });

  assert.deepEqual(event, {
    kind: "invalid",
    replyTarget: { messageId: "21", telegramChatId: "-100987654321" },
    source: "confirmation",
  });
});

test("Telegram conversation ingress rejects an update without a supported payload", async () => {
  const event = await plugin.handlers.conversationIngress.normalize({ update_id: 12 });

  assert.deepEqual(event, {
    kind: "invalid",
    replyTarget: null,
    source: "message",
  });
});
