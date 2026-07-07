export const tgBotAppPackageName = "@task/tg-bot";

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
