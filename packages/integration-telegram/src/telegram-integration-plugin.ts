import {
  defineIntegrationPlugin,
  type IntegrationPlugin,
  type IntegrationWebhookHandler,
} from "@task/integration-sdk";
import {
  createTelegramConversationIngress,
  type TelegramConversationIngress,
} from "./telegram-conversation-ingress.js";
import { createTelegramWebhookHandler } from "./telegram-webhook.js";

export const telegramIntegrationManifest = {
  apiVersion: 1,
  auth: { kind: "bot_token", scopes: [] },
  capabilities: [{ kind: "conversation_ingress" }, { kind: "webhook_handler" }],
  description:
    "Connect Telegram chats to a workspace and invoke the workspace agent from supported messages and mentions.",
  iconKey: "telegram",
  name: "Telegram",
  pluginKey: "telegram",
  pluginVersion: "0.1.0",
} as const;

export const telegramIntegrationPlugin = defineIntegrationPlugin(telegramIntegrationManifest);

export type TelegramIntegrationPluginOptions = {
  botUsername: string | null;
  webhookSecret: string | null;
};

export type TelegramIntegrationPlugin = Omit<IntegrationPlugin, "handlers"> & {
  handlers: {
    conversationIngress: TelegramConversationIngress;
    webhook: IntegrationWebhookHandler;
  };
};

export function createTelegramIntegrationPlugin(
  options: TelegramIntegrationPluginOptions,
): TelegramIntegrationPlugin {
  return {
    handlers: {
      conversationIngress: createTelegramConversationIngress(options.botUsername),
      webhook: createTelegramWebhookHandler(options.webhookSecret),
    },
    manifest: telegramIntegrationManifest,
  };
}
