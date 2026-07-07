export const tgBotAppPackageName = "@task/tg-bot";

export {
  createTelegramBackendClient,
  type ResolveTelegramContextInput,
  type ResolveTelegramContextRequest,
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramBackendClientOptions,
  type TelegramBackendFetch,
  type TelegramBackendFetchInit,
  type TelegramBackendFetchResponse,
  type TelegramBackendPostHeaders,
  type TelegramContextResolutionResponse,
} from "./backend-client.js";

export {
  InvalidTelegramBotEnvironmentError,
  loadTelegramBotConfig,
  parseTelegramBotConfig,
  type TelegramBotConfig,
  type TelegramBotEnvironment,
} from "./config.js";

export {
  parseTelegramMessageContext,
  type TelegramAttachmentContext,
  type TelegramChatContext,
  type TelegramDocumentAttachmentContext,
  type TelegramMessageContext,
  type TelegramMessageEntityContext,
  type TelegramPhotoAttachmentContext,
  TelegramUpdateParseError,
  type TelegramUserContext,
} from "./telegram-update.js";
