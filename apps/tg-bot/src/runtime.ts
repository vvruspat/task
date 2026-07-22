import type {
  IntegrationWebhookRequest,
  IntegrationWebhookVerificationResult,
} from "@task/integration-sdk";
import { createTelegramIntegrationPlugin } from "@task/integration-telegram";
import { createTelegramBackendClient, type TelegramBackendFetch } from "./backend-client.js";
import {
  loadTelegramBotConfig,
  type TelegramBotConfig,
  type TelegramBotEnvironment,
} from "./config.js";
import { createTelegramReplySender, type TelegramBotApiFetch } from "./telegram-sender.js";
import {
  processTelegramConversationEvent,
  type TelegramUpdateProcessorResult,
} from "./update-processor.js";

export type TelegramBotRuntime = {
  processUpdate(update: unknown): Promise<TelegramUpdateProcessorResult>;
  verifyWebhook(request: IntegrationWebhookRequest): Promise<IntegrationWebhookVerificationResult>;
};

export type CreateTelegramBotRuntimeOptions = {
  config: TelegramBotConfig;
  backendFetch?: TelegramBackendFetch;
  telegramFetch?: TelegramBotApiFetch;
};

export type CreateTelegramBotRuntimeFromEnvironmentOptions = {
  environment?: TelegramBotEnvironment;
  backendFetch?: TelegramBackendFetch;
  telegramFetch?: TelegramBotApiFetch;
};

export function createTelegramBotRuntime(
  options: CreateTelegramBotRuntimeOptions,
): TelegramBotRuntime {
  const backendClientOptions = {
    baseUrl: options.config.backendBaseUrl,
    botSharedSecret: options.config.backendBotSharedSecret,
  };
  const backendClient = createTelegramBackendClient(
    options.backendFetch === undefined
      ? backendClientOptions
      : {
          ...backendClientOptions,
          fetch: options.backendFetch,
        },
  );
  const replySenderOptions = {
    botToken: options.config.botToken,
  };
  const replySender = createTelegramReplySender(
    options.telegramFetch === undefined
      ? replySenderOptions
      : {
          ...replySenderOptions,
          fetch: options.telegramFetch,
        },
  );
  const plugin = createTelegramIntegrationPlugin({
    botUsername: options.config.botUsername,
    webhookSecret: options.config.webhookSecret,
  });

  return {
    async processUpdate(update: unknown): Promise<TelegramUpdateProcessorResult> {
      const event = await plugin.handlers.conversationIngress.normalize(update);
      return processTelegramConversationEvent(event, {
        backendClient,
        botUsername: options.config.botUsername,
        replySender,
      });
    },
    verifyWebhook(request: IntegrationWebhookRequest) {
      return plugin.handlers.webhook.verify(request);
    },
  };
}

export function createTelegramBotRuntimeFromEnvironment(
  options: CreateTelegramBotRuntimeFromEnvironmentOptions = {},
): TelegramBotRuntime {
  const runtimeOptions: CreateTelegramBotRuntimeOptions = {
    config: loadTelegramBotConfig(options.environment),
  };

  if (options.backendFetch !== undefined) {
    runtimeOptions.backendFetch = options.backendFetch;
  }

  if (options.telegramFetch !== undefined) {
    runtimeOptions.telegramFetch = options.telegramFetch;
  }

  return createTelegramBotRuntime(runtimeOptions);
}
