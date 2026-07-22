import type { IntegrationConversationIngressHandler } from "@task/integration-sdk";
import {
  isTelegramAgentInvocation,
  parseTelegramConfirmationCallbackContext,
  parseTelegramMessageContext,
  readTelegramCallbackReplyTarget,
  type TelegramConfirmationCallbackContext,
  type TelegramMessageContext,
  type TelegramReplyTarget,
  TelegramUpdateParseError,
} from "./telegram-update.js";

export type TelegramMessageConversationEvent = {
  kind: "message";
  invokesAgent: boolean;
  message: TelegramMessageContext;
};

export type TelegramConfirmationConversationEvent = {
  kind: "confirmation";
  callback: TelegramConfirmationCallbackContext;
};

export type TelegramInvalidConversationEvent = {
  kind: "invalid";
  source: "confirmation" | "message";
  replyTarget: TelegramReplyTarget | null;
};

export type TelegramConversationEvent =
  | TelegramMessageConversationEvent
  | TelegramConfirmationConversationEvent
  | TelegramInvalidConversationEvent;

export type TelegramConversationIngress =
  IntegrationConversationIngressHandler<TelegramConversationEvent>;

export function createTelegramConversationIngress(
  botUsername: string | null,
): TelegramConversationIngress {
  return {
    async normalize(payload: unknown): Promise<TelegramConversationEvent> {
      if (hasCallbackQuery(payload)) {
        try {
          return {
            callback: parseTelegramConfirmationCallbackContext(payload),
            kind: "confirmation",
          };
        } catch (error: unknown) {
          if (!(error instanceof TelegramUpdateParseError)) throw error;
          return {
            kind: "invalid",
            replyTarget: readTelegramCallbackReplyTarget(payload),
            source: "confirmation",
          };
        }
      }

      try {
        const message = parseTelegramMessageContext(payload);
        return {
          invokesAgent: isTelegramAgentInvocation(message, botUsername),
          kind: "message",
          message,
        };
      } catch (error: unknown) {
        if (!(error instanceof TelegramUpdateParseError)) throw error;
        return { kind: "invalid", replyTarget: null, source: "message" };
      }
    },
  };
}

function hasCallbackQuery(value: unknown): boolean {
  return isUnknownRecord(value) && readProperty(value, "callback_query") !== undefined;
}

function readProperty(record: Record<string, unknown>, key: string): unknown {
  return record[key];
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
