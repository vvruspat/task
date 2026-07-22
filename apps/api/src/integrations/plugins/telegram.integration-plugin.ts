import { defineIntegrationPlugin } from "@task/integration-sdk";

export const telegramIntegrationPlugin = defineIntegrationPlugin({
  apiVersion: 1,
  auth: { kind: "bot_token", scopes: [] },
  capabilities: [{ kind: "conversation_ingress" }, { kind: "webhook_handler" }],
  description:
    "Connect Telegram chats to a workspace and invoke the workspace agent from supported messages and mentions.",
  iconKey: "telegram",
  name: "Telegram",
  pluginKey: "telegram",
  pluginVersion: "0.1.0",
});
