import type {
  TelegramConfirmationCallbackContext,
  TelegramConversationEvent,
} from "@task/integration-telegram";
import { createTelegramConversationIngress } from "@task/integration-telegram";
import {
  type TelegramAgentRunIntakeResponse,
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramConfirmationCallbackResponse,
} from "./backend-client.js";
import {
  handleTelegramMessage,
  type TelegramInlineKeyboardMarkup,
  type TelegramReplyAction,
  type TelegramResolvedMessageAction,
} from "./message-handler.js";
import {
  createTelegramConfirmationInlineKeyboard,
  type TelegramReplySender,
  type TelegramSendMessageResult,
} from "./telegram-sender.js";

export { isTelegramAgentInvocation } from "@task/integration-telegram";

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
  const ingress = createTelegramConversationIngress(options.botUsername ?? null);
  return processTelegramConversationEvent(await ingress.normalize(update), options);
}

export async function processTelegramConversationEvent(
  event: TelegramConversationEvent,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramUpdateProcessorResult> {
  if (event.kind === "invalid") {
    return sendReply(
      createReply(
        event.replyTarget?.telegramChatId ?? null,
        event.replyTarget?.messageId ?? null,
        event.source === "confirmation"
          ? "Не смог обработать подтверждение."
          : "Не смог прочитать сообщение Telegram.",
      ),
      options.replySender,
    );
  }

  if (event.kind === "confirmation") {
    return processTelegramConfirmationCallback(event.callback, options);
  }

  const action = await handleTelegramMessage(event.message, {
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

  if (!event.invokesAgent) {
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
  callback: TelegramConfirmationCallbackContext,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramConfirmationCallbackReplySentAction | TelegramReplySentAction> {
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
