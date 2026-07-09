export type ResolveTelegramContextInput = {
  telegramId: string;
  telegramChatId: string;
};

export type TelegramConfirmationCallbackAction = "confirm" | "cancel";

export type TelegramConfirmationCallbackInput = {
  telegramId: string;
  telegramChatId: string;
  confirmationRequestId: string;
  action: TelegramConfirmationCallbackAction;
};

export type TelegramConfirmationCallbackResult = {
  confirmationRequestId: string;
  action: TelegramConfirmationCallbackAction;
  status: "confirmed" | "cancelled";
};

export type TelegramContextResolution =
  | {
      status: "resolved";
      userId: string;
      workspaceId: string;
      defaultProjectId: string | null;
    }
  | {
      status: "telegram_user_unlinked";
    }
  | {
      status: "telegram_chat_unlinked";
      userId: string;
    }
  | {
      status: "user_not_in_chat_workspace";
      userId: string;
      workspaceId: string;
    };
