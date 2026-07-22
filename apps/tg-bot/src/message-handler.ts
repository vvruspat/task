import {
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramContextResolutionResponse,
} from "./backend-client.js";
import type { TelegramMessageContext } from "./telegram-update.js";

export type TelegramMessageHandlerOptions = {
  backendClient: TelegramBackendClient;
};

export type TelegramReplyAction = {
  kind: "reply";
  telegramChatId: string | null;
  replyToMessageId: string | null;
  text: string;
  inlineKeyboard?: TelegramInlineKeyboardMarkup;
};

export type TelegramInlineKeyboardMarkup = {
  rows: TelegramInlineKeyboardButton[][];
};

export type TelegramInlineKeyboardButton = {
  text: string;
  callbackData: string;
};

export type TelegramResolvedMessageAction = {
  kind: "resolved";
  message: TelegramMessageContext;
  context: TelegramResolvedContext;
};

export type TelegramResolvedContext = TelegramContextResolutionResponse & {
  status: "resolved";
  userId: string;
  workspaceId: string;
  defaultProjectId: string | null;
};

export type TelegramMessageHandlerAction = TelegramReplyAction | TelegramResolvedMessageAction;

export async function handleTelegramMessage(
  message: TelegramMessageContext,
  options: TelegramMessageHandlerOptions,
): Promise<TelegramMessageHandlerAction> {
  const connectToken = readTelegramConnectToken(message.text);
  if (connectToken !== null) {
    try {
      await options.backendClient.completeTelegramChatConnection({
        body: {
          telegramChatId: message.chat.telegramChatId,
          telegramId: message.sender.telegramId,
          title: message.chat.title,
          token: connectToken,
        },
      });
      return createReply(
        message.chat.telegramChatId,
        message.messageId,
        "Чат подключён к workspace tAsk.",
      );
    } catch (error: unknown) {
      if (error instanceof TelegramBackendClientError) {
        return createReply(
          message.chat.telegramChatId,
          message.messageId,
          "Не удалось подключить чат. Проверь токен и привязку Telegram к аккаунту tAsk.",
        );
      }
      throw error;
    }
  }

  let context: TelegramContextResolutionResponse;

  try {
    context = await options.backendClient.resolveTelegramContext({
      body: {
        telegramId: message.sender.telegramId,
        telegramChatId: message.chat.telegramChatId,
      },
    });
  } catch (error) {
    if (error instanceof TelegramBackendClientError) {
      return createReply(
        message.chat.telegramChatId,
        message.messageId,
        "Сейчас не удалось проверить доступ в tAsk. Попробуй позже.",
      );
    }

    throw error;
  }

  if (context.status === "telegram_user_unlinked") {
    return createReply(
      message.chat.telegramChatId,
      message.messageId,
      "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
    );
  }

  if (context.status === "telegram_chat_unlinked") {
    return createReply(
      message.chat.telegramChatId,
      message.messageId,
      "Этот чат ещё не привязан к workspace tAsk. Попроси администратора привязать чат.",
    );
  }

  if (context.status === "user_not_in_chat_workspace") {
    return createReply(
      message.chat.telegramChatId,
      message.messageId,
      "Ты не состоишь в workspace, к которому привязан этот чат.",
    );
  }

  return {
    kind: "resolved",
    message,
    context: readResolvedContext(context),
  };
}

export function readTelegramConnectToken(text: string | null): string | null {
  if (text === null) return null;
  const match = /^\/connect(?:@[A-Za-z0-9_]{5,32})?\s+([A-Za-z0-9_-]{43})\s*$/u.exec(text);
  return match?.[1] ?? null;
}

function createReply(
  telegramChatId: string | null,
  replyToMessageId: string | null,
  text: string,
): TelegramReplyAction {
  return {
    kind: "reply",
    telegramChatId,
    replyToMessageId,
    text,
  };
}

function readResolvedContext(context: TelegramContextResolutionResponse): TelegramResolvedContext {
  if (
    context.status !== "resolved" ||
    typeof context.userId !== "string" ||
    typeof context.workspaceId !== "string" ||
    (context.defaultProjectId !== null && typeof context.defaultProjectId !== "string")
  ) {
    throw new TelegramBackendClientError("Resolved Telegram context response is malformed.");
  }

  return {
    status: "resolved",
    userId: context.userId,
    workspaceId: context.workspaceId,
    defaultProjectId: context.defaultProjectId,
  };
}
