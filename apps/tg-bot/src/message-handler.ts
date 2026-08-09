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

export type TelegramInlineKeyboardButton =
  | { text: string; callbackData: string; loginUrl?: never }
  | { text: string; loginUrl: string; callbackData?: never };

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
  const connectCommand = readTelegramConnectCommand(message.text);
  if (connectCommand?.kind === "browser") {
    try {
      const intent = await options.backendClient.createTelegramBrowserConnectIntent({
        body: {
          telegramChatId: message.chat.telegramChatId,
          telegramId: message.sender.telegramId,
          title: message.chat.title,
        },
      });
      return createReply(
        message.chat.telegramChatId,
        message.messageId,
        "Открой tAsk, войди в аккаунт и заверши привязку Telegram.",
        { rows: [[{ text: "Открыть tAsk", loginUrl: intent.loginUrl }]] },
      );
    } catch (error: unknown) {
      if (error instanceof TelegramBackendClientError) {
        return createReply(
          message.chat.telegramChatId,
          message.messageId,
          "Не удалось создать ссылку для подключения. Попробуй позже.",
        );
      }
      throw error;
    }
  }
  if (connectCommand?.kind === "token") {
    try {
      await options.backendClient.completeTelegramChatConnection({
        body: {
          telegramChatId: message.chat.telegramChatId,
          telegramId: message.sender.telegramId,
          title: message.chat.title,
          token: connectCommand.token,
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
        telegramUsername: message.sender.username,
        firstName: message.sender.firstName,
        lastName: message.sender.lastName,
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
  const command = readTelegramConnectCommand(text);
  return command?.kind === "token" ? command.token : null;
}

export type TelegramConnectCommand = { kind: "browser" } | { kind: "token"; token: string };

export function readTelegramConnectCommand(text: string | null): TelegramConnectCommand | null {
  if (text === null) return null;
  const match = /^\/connect(?:@[A-Za-z0-9_]{5,32})?(?:\s+([A-Za-z0-9_-]{43}))?\s*$/u.exec(text);
  if (match === null) return null;
  const token = match[1];
  return token === undefined ? { kind: "browser" } : { kind: "token", token };
}

function createReply(
  telegramChatId: string | null,
  replyToMessageId: string | null,
  text: string,
  inlineKeyboard?: TelegramInlineKeyboardMarkup,
): TelegramReplyAction {
  return {
    kind: "reply",
    telegramChatId,
    replyToMessageId,
    text,
    ...(inlineKeyboard === undefined ? {} : { inlineKeyboard }),
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
