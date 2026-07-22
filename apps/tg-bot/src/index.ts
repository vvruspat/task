export const tgBotAppPackageName = "@task/tg-bot";

export {
  type CreateTelegramAgentRunInput,
  type CreateTelegramAgentRunRequest,
  createTelegramBackendClient,
  type ResolveTelegramContextInput,
  type ResolveTelegramContextRequest,
  type TelegramAgentRunIntakeResponse,
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
  handleTelegramMessage,
  type TelegramInlineKeyboardButton,
  type TelegramInlineKeyboardMarkup,
  type TelegramMessageHandlerAction,
  type TelegramMessageHandlerOptions,
  type TelegramReplyAction,
  type TelegramResolvedContext,
  type TelegramResolvedMessageAction,
} from "./message-handler.js";

export {
  type CreateTelegramBotRuntimeFromEnvironmentOptions,
  type CreateTelegramBotRuntimeOptions,
  createTelegramBotRuntime,
  createTelegramBotRuntimeFromEnvironment,
  type TelegramBotRuntime,
} from "./runtime.js";

export {
  createTelegramConfirmationInlineKeyboard,
  createTelegramReplySender,
  type TelegramBotApiFetch,
  type TelegramBotApiFetchInit,
  type TelegramBotApiFetchResponse,
  type TelegramBotApiPostHeaders,
  type TelegramReplySender,
  TelegramReplySenderError,
  type TelegramReplySenderOptions,
  type TelegramSendMessageResult,
} from "./telegram-sender.js";

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

export {
  processTelegramConversationEvent,
  processTelegramUpdate,
  type TelegramReplySentAction,
  type TelegramUpdateProcessorOptions,
  type TelegramUpdateProcessorResult,
} from "./update-processor.js";

export {
  handleTelegramWebhookRequest,
  type TelegramWebhookAcceptedResult,
  type TelegramWebhookFailedResult,
  TelegramWebhookHandlerError,
  type TelegramWebhookHandlerOptions,
  type TelegramWebhookHandlingResult,
  type TelegramWebhookRequest,
  type TelegramWebhookUnauthorizedResult,
  telegramWebhookSecretHeaderName,
} from "./webhook-handler.js";

export {
  handleTelegramWebhookHttpRequest,
  type TelegramWebhookHttpAcceptedResponse,
  type TelegramWebhookHttpFailedResponse,
  type TelegramWebhookHttpHeaders,
  type TelegramWebhookHttpHeaderValue,
  type TelegramWebhookHttpMethodNotAllowedResponse,
  type TelegramWebhookHttpRequest,
  type TelegramWebhookHttpResponse,
  type TelegramWebhookHttpUnauthorizedResponse,
} from "./webhook-http-adapter.js";

export {
  createTelegramWebhookServer,
  handleTelegramWebhookNodeRequest,
  runTelegramWebhookServerFromEnvironment,
  TelegramWebhookServerError,
  type TelegramWebhookServerFromEnvironmentOptions,
  type TelegramWebhookServerOptions,
} from "./webhook-server.js";
