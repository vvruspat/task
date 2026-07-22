import { createTelegramBackendClient, type TelegramBackendFetch } from "./backend-client.js";
import {
  loadTelegramBotConfig,
  type TelegramBotConfig,
  type TelegramBotEnvironment,
} from "./config.js";
import { createTelegramReplySender, type TelegramBotApiFetch } from "./telegram-sender.js";
import { processTelegramUpdate, type TelegramUpdateProcessorResult } from "./update-processor.js";

export type TelegramBotRuntime = {
  processUpdate(update: unknown): Promise<TelegramUpdateProcessorResult>;
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

  return {
    processUpdate(update: unknown) {
      return processTelegramUpdate(update, {
        backendClient,
        botUsername: options.config.botUsername,
        replySender,
      });
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
