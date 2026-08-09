import type {
  TelegramConfirmationCallbackContext,
  TelegramConversationEvent,
} from "@task/integration-telegram";
import {
  createTelegramConversationIngress,
  normalizeTelegramAgentInput,
} from "@task/integration-telegram";
import {
  type RecordTelegramChatMessageResponse,
  type TelegramAgentRunIntakeResponse,
  type TelegramBackendClient,
  TelegramBackendClientError,
  type TelegramConfirmationCallbackResponse,
} from "./backend-client.js";
import {
  handleTelegramMessage,
  readTelegramConnectCommand,
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
  logger?: TelegramUpdateProcessorLogger;
  replySender: TelegramReplySender;
};

export type TelegramUpdateProcessorLogger = {
  error(error: unknown): void;
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

export type TelegramAgentRunInProgressAction = {
  kind: "agent_run_in_progress";
  agentRun: TelegramAgentRunIntakeResponse;
};

export type TelegramConfirmationCallbackReplySentAction = {
  kind: "confirmation_callback_reply_sent";
  callback: TelegramConfirmationCallbackResponse;
  reply: TelegramReplyAction;
  sentMessage: TelegramSendMessageResult;
};

export type TelegramMessageObservedAction = {
  kind: "message_observed";
  recording: RecordTelegramChatMessageResponse | null;
};

export type TelegramUpdateProcessorResult =
  | TelegramReplySentAction
  | TelegramAgentRunReplySentAction
  | TelegramAgentRunInProgressAction
  | TelegramConfirmationCallbackReplySentAction
  | TelegramMessageObservedAction
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
  try {
    return await processTelegramConversationEventUnsafe(event, options);
  } catch (error: unknown) {
    logTelegramProcessingError(error, options);
    const fallbackReply = createUnexpectedErrorReply(event);
    if (fallbackReply === null) throw error;
    return sendReply(fallbackReply, options.replySender);
  }
}

async function processTelegramConversationEventUnsafe(
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

  const recording = await recordTelegramMessageSafely(event.message, options);
  if (!event.invokesAgent && readTelegramConnectCommand(event.message.text) === null) {
    return { kind: "message_observed", recording };
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

  const inputText = normalizeTelegramAgentInput(action.message, options.botUsername ?? null);
  if (inputText === null) {
    return sendReply(
      createReply(
        action.message.chat.telegramChatId,
        action.message.messageId,
        "Напиши запрос после упоминания бота или команды /task.",
      ),
      options.replySender,
    );
  }

  try {
    const agentRun = await options.backendClient.createTelegramAgentRun({
      body: {
        telegramId: action.message.sender.telegramId,
        telegramChatId: action.message.chat.telegramChatId,
        telegramThreadId: action.message.threadId,
        sourceMessageId: action.message.messageId,
        inputText,
        attachments: action.message.attachments,
      },
    });
    if (agentRun.status === "running") {
      return {
        kind: "agent_run_in_progress",
        agentRun,
      };
    }
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

async function recordTelegramMessageSafely(
  message: TelegramResolvedMessageAction["message"],
  options: TelegramUpdateProcessorOptions,
): Promise<RecordTelegramChatMessageResponse | null> {
  try {
    return await recordTelegramMessage(message, options.backendClient);
  } catch (error: unknown) {
    logTelegramProcessingError(error, options);
    return null;
  }
}

async function recordTelegramMessage(
  message: TelegramResolvedMessageAction["message"],
  backendClient: TelegramBackendClient,
): Promise<RecordTelegramChatMessageResponse | null> {
  if (message.text === null || message.text.trim().length === 0) return null;
  return backendClient.recordTelegramChatMessage({
    body: {
      telegramChatId: message.chat.telegramChatId,
      telegramMessageId: message.messageId,
      telegramThreadId: message.threadId,
      replyToTelegramMessageId: message.replyToMessageId,
      senderTelegramId: message.sender.telegramId,
      senderDisplayName: telegramSenderDisplayName(message.sender),
      senderIsBot: message.sender.isBot,
      text: message.text,
      sentAt: null,
    },
  });
}

function telegramSenderDisplayName(
  sender: TelegramResolvedMessageAction["message"]["sender"],
): string {
  const fullName = [sender.firstName, sender.lastName]
    .filter((part): part is string => part !== null && part.trim().length > 0)
    .join(" ");
  if (sender.username !== null) {
    return fullName.length === 0 ? `@${sender.username}` : `${fullName} (@${sender.username})`;
  }
  return fullName.length === 0 ? sender.telegramId : fullName;
}

function createUnexpectedErrorReply(event: TelegramConversationEvent): TelegramReplyAction | null {
  const text = "Не удалось обработать запрос из-за внутренней ошибки. Попробуй ещё раз позже.";
  if (event.kind === "message") {
    return createReply(event.message.chat.telegramChatId, event.message.messageId, text);
  }
  if (event.kind === "confirmation") {
    return createReply(event.callback.chat.telegramChatId, event.callback.messageId, text);
  }
  if (event.replyTarget === null) return null;
  return createReply(event.replyTarget.telegramChatId, event.replyTarget.messageId, text);
}

function logTelegramProcessingError(error: unknown, options: TelegramUpdateProcessorOptions): void {
  (options.logger ?? console).error(error);
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
