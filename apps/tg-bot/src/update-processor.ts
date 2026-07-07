import type { TelegramBackendClient } from "./backend-client.js";
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

export type TelegramUpdateProcessorResult = TelegramReplySentAction | TelegramResolvedMessageAction;

export async function processTelegramUpdate(
  update: unknown,
  options: TelegramUpdateProcessorOptions,
): Promise<TelegramUpdateProcessorResult> {
  const action = await handleTelegramUpdate(update, {
    backendClient: options.backendClient,
  });

  if (action.kind === "reply") {
    return {
      kind: "reply_sent",
      reply: action,
      sentMessage: await options.replySender.sendReply(action),
    };
  }

  return action;
}
