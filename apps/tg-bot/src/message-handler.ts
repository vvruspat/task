import {
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramContextResolutionResponse,
} from "./backend-client.js";
import {
  parseTelegramMessageContext,
  type TelegramMessageContext,
  TelegramUpdateParseError,
} from "./telegram-update.js";

export type TelegramMessageHandlerOptions = {
  backendClient: TelegramBackendClient;
};

export type TelegramReplyAction = {
  kind: "reply";
  replyToMessageId: string | null;
  text: string;
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

export async function handleTelegramUpdate(
  update: unknown,
  options: TelegramMessageHandlerOptions,
): Promise<TelegramMessageHandlerAction> {
  let message: TelegramMessageContext;

  try {
    message = parseTelegramMessageContext(update);
  } catch (error) {
    if (error instanceof TelegramUpdateParseError) {
      return createReply(null, "Не смог прочитать сообщение Telegram.");
    }

    throw error;
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
        message.messageId,
        "Сейчас не удалось проверить доступ в tAsk. Попробуй позже.",
      );
    }

    throw error;
  }

  if (context.status === "telegram_user_unlinked") {
    return createReply(
      message.messageId,
      "Сначала привяжи Telegram к аккаунту tAsk через Mini App.",
    );
  }

  if (context.status === "telegram_chat_unlinked") {
    return createReply(
      message.messageId,
      "Этот чат ещё не привязан к workspace tAsk. Попроси администратора привязать чат.",
    );
  }

  if (context.status === "user_not_in_chat_workspace") {
    return createReply(
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

function createReply(replyToMessageId: string | null, text: string): TelegramReplyAction {
  return {
    kind: "reply",
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
