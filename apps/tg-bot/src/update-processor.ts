import {
  type TelegramAgentRunIntakeResponse,
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramConfirmationCallbackResponse,
} from "./backend-client.js";
import {
  handleTelegramUpdate,
  type TelegramInlineKeyboardMarkup,
  type TelegramReplyAction,
  type TelegramResolvedMessageAction,
} from "./message-handler.js";
import {
  createTelegramConfirmationInlineKeyboard,
  type TelegramReplySender,
  type TelegramSendMessageResult,
} from "./telegram-sender.js";
import type { TelegramMessageContext } from "./telegram-update.js";
import {
  parseTelegramConfirmationCallbackContext,
  type TelegramConfirmationCallbackContext,
  TelegramUpdateParseError,
} from "./telegram-update.js";

export type TelegramUpdateProcessorOptions = {
  backendClient: TelegramBackendClient;
  botUsername?: string | null;
  replySender: TelegramReplySender;
};

export type TelegramReplySentAction = {
  kind: "reply_sent";
  reply: TelegramReplyAction;
  sentMessage: TelegramSendMessageResult;
};

export type TelegramAgentRunReplySentAction = {
  kind: "agent_run_reply_sent";
  agentRun: TelegramAgentRunIntakeResponse;
  reply: TelegramReplyAction;
  sentMessage: TelegramSendMessageResult;
};

export type TelegramConfirmationCallbackReplySentAction = {
  kind: "confirmation_callback_reply_sent";
  callback: TelegramConfirmationCallbackResponse;
  reply: TelegramReplyAction;
  sentMessage: TelegramSendMessageResult;
};

export type TelegramUpdateProcessorResult =
  | TelegramReplySentAction
  | TelegramAgentRunReplySentAction
  | TelegramConfirmationCallbackReplySentAction
  | TelegramResolvedMessageAction;

export async function processTelegramUpdate(
  update: unknown,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramUpdateProcessorResult> {
  const callbackResult = await processTelegramConfirmationCallback(update, options);

  if (callbackResult !== null) {
    return callbackResult;
  }

  const action = await handleTelegramUpdate(update, {
    backendClient: options.backendClient,
  });

  if (action.kind === "reply") {
    return sendReply(action, options.replySender);
  }

  if (action.message.text === null || action.message.text.trim().length === 0) {
    return sendReply(
      createReply(
        action.message.chat.telegramChatId,
        action.message.messageId,
        "Пока я принимаю только текстовые команды для агента tAsk.",
      ),
      options.replySender,
    );
  }

  if (!isTelegramAgentInvocation(action.message, options.botUsername ?? null)) {
    const instruction =
      options.botUsername === null || options.botUsername === undefined
        ? "используй /task"
        : `упомяни @${options.botUsername} или используй /task`;
    return sendReply(
      createReply(
        action.message.chat.telegramChatId,
        action.message.messageId,
        `Чтобы вызвать агента в групповом чате, ${instruction}.`,
      ),
      options.replySender,
    );
  }

  try {
    const agentRun = await options.backendClient.createTelegramAgentRun({
      body: {
        telegramId: action.message.sender.telegramId,
        telegramChatId: action.message.chat.telegramChatId,
        sourceMessageId: action.message.messageId,
        inputText: action.message.text,
        attachments: action.message.attachments,
      },
    });
    const reply = createReply(
      action.message.chat.telegramChatId,
      action.message.messageId,
      agentRun.responseText,
      createAgentRunInlineKeyboard(agentRun),
    );

    return {
      kind: "agent_run_reply_sent",
      agentRun,
      reply,
      sentMessage: await options.replySender.sendReply(reply),
    };
  } catch (error) {
    if (error instanceof TelegramBackendClientError) {
      return sendReply(
        createReply(
          action.message.chat.telegramChatId,
          action.message.messageId,
          "Сейчас не удалось отправить запрос агенту tAsk. Попробуй позже.",
        ),
        options.replySender,
      );
    }

    throw error;
  }
}

export function isTelegramAgentInvocation(
  message: TelegramMessageContext,
  botUsername: string | null,
): boolean {
  if (message.chat.type === "private") return true;
  if (message.text === null) return false;
  for (const entity of message.entities) {
    const entityText = message.text.slice(entity.offset, entity.offset + entity.length);
    if (entity.type === "bot_command" && isTaskCommand(entityText, botUsername)) return true;
    if (
      entity.type === "mention" &&
      botUsername !== null &&
      entityText.toLowerCase() === `@${botUsername.toLowerCase()}`
    ) {
      return true;
    }
  }
  return false;
}

function isTaskCommand(value: string, botUsername: string | null): boolean {
  const match = /^\/task(?:@([A-Za-z0-9_]{5,32}))?$/u.exec(value);
  if (match === null) return false;
  const addressedUsername = match[1];
  return (
    addressedUsername === undefined ||
    (botUsername !== null && addressedUsername.toLowerCase() === botUsername.toLowerCase())
  );
}

async function sendReply(
  reply: TelegramReplyAction,
  replySender: TelegramReplySender,
): Promise<TelegramReplySentAction> {
  return {
    kind: "reply_sent",
    reply,
    sentMessage: await replySender.sendReply(reply),
  };
}

async function processTelegramConfirmationCallback(
  update: unknown,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramConfirmationCallbackReplySentAction | TelegramReplySentAction | null> {
  let callback: TelegramConfirmationCallbackContext;

  try {
    callback = parseTelegramConfirmationCallbackContext(update);
  } catch (error) {
    if (error instanceof TelegramUpdateParseError) {
      const replyTarget = readTelegramCallbackReplyTarget(update);

      if (replyTarget !== null) {
        return sendReply(
          createReply(
            replyTarget.telegramChatId,
            replyTarget.messageId,
            "Не смог обработать подтверждение.",
          ),
          options.replySender,
        );
      }

      return null;
    }

    throw error;
  }

  try {
    const backendResult = await options.backendClient.handleTelegramConfirmationCallback({
      body: {
        telegramId: callback.sender.telegramId,
        telegramChatId: callback.chat.telegramChatId,
        confirmationRequestId: callback.confirmationRequestId,
        action: callback.action,
      },
    });
    const reply = createReply(
      callback.chat.telegramChatId,
      callback.messageId,
      backendResult.status === "confirmed" ? "Подтверждено." : "Отменено.",
    );

    return {
      kind: "confirmation_callback_reply_sent",
      callback: backendResult,
      reply,
      sentMessage: await options.replySender.sendReply(reply),
    };
  } catch (error) {
    if (error instanceof TelegramBackendClientError) {
      return sendReply(
        createReply(
          callback.chat.telegramChatId,
          callback.messageId,
          "Сейчас не удалось обработать подтверждение. Попробуй позже.",
        ),
        options.replySender,
      );
    }

    throw error;
  }
}

function readTelegramCallbackReplyTarget(update: unknown): TelegramCallbackReplyTarget | null {
  if (!isUnknownRecord(update)) {
    return null;
  }

  const callbackQuery = readProperty(update, "callback_query");

  if (!isUnknownRecord(callbackQuery)) {
    return null;
  }

  const message = readProperty(callbackQuery, "message");

  if (!isUnknownRecord(message)) {
    return null;
  }

  const chat = readProperty(message, "chat");

  if (!isUnknownRecord(chat)) {
    return null;
  }

  const messageId = readTelegramIntegerString(readProperty(message, "message_id"));
  const telegramChatId = readTelegramIntegerString(readProperty(chat, "id"));

  if (messageId === null || telegramChatId === null) {
    return null;
  }

  return { messageId, telegramChatId };
}

function readProperty(record: Record<string, unknown>, propertyName: string): unknown {
  return record[propertyName];
}

function readTelegramIntegerString(value: unknown): string | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return value;
  }

  return null;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type TelegramCallbackReplyTarget = {
  telegramChatId: string;
  messageId: string;
};

function createAgentRunInlineKeyboard(
  agentRun: TelegramAgentRunIntakeResponse,
): TelegramInlineKeyboardMarkup | undefined {
  if (agentRun.status !== "waiting_confirmation") {
    return undefined;
  }

  const [confirmationRequest] = agentRun.pendingConfirmationRequests;

  if (confirmationRequest === undefined) {
    return undefined;
  }

  return createTelegramConfirmationInlineKeyboard(confirmationRequest.id);
}

function createReply(
  telegramChatId: string,
  replyToMessageId: string,
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
