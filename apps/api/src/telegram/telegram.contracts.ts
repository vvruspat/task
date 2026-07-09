export type ResolveTelegramContextInput = {
  telegramId: string;
  telegramChatId: string;
};

export type VerifyTelegramMiniAppInitDataInput = {
  initData: string;
};

export type VerifiedTelegramMiniAppInitData = {
  telegramId: string;
  authDate: string;
};

export type LinkTelegramMiniAppIdentityInput = {
  userId: string;
  initData: string;
};

export type LinkTelegramIdentityInput = {
  userId: string;
  telegramId: string;
};

export type LinkedTelegramIdentity = {
  telegramId: string;
  userId: string;
};

export type LinkTelegramIdentityResult =
  | {
      status: "linked";
      identity: LinkedTelegramIdentity;
    }
  | {
      status: "user_not_found";
    }
  | {
      status: "telegram_identity_linked_to_different_user";
      telegramId: string;
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
