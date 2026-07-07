import {
  type TelegramAgentRunIntakeResponse,
  type TelegramBackendClient,
  TelegramBackendClientError,
} from "./backend-client.js";
import {
  handleTelegramUpdate,
  type TelegramReplyAction,
  type TelegramResolvedMessageAction,
} from "./message-handler.js";
import type { TelegramReplySender, TelegramSendMessageResult } from "./telegram-sender.js";

export type TelegramUpdateProcessorOptions = {
  backendClient: TelegramBackendClient;
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

export type TelegramUpdateProcessorResult =
  | TelegramReplySentAction
  | TelegramAgentRunReplySentAction
  | TelegramResolvedMessageAction;

export async function processTelegramUpdate(
  update: unknown,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramUpdateProcessorResult> {
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

  try {
    const agentRun = await options.backendClient.createTelegramAgentRun({
      body: {
        telegramId: action.message.sender.telegramId,
        telegramChatId: action.message.chat.telegramChatId,
        sourceMessageId: action.message.messageId,
        inputText: action.message.text,
      },
    });
    const reply = createReply(
      action.message.chat.telegramChatId,
      action.message.messageId,
      agentRun.responseText,
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

function createReply(
  telegramChatId: string,
  replyToMessageId: string,
  text: string,
): TelegramReplyAction {
  return {
    kind: "reply",
    telegramChatId,
    replyToMessageId,
    text,
  };
}
