export type TelegramConnectToken = {
  command: string;
  expiresAt: Date;
};

export type CompleteTelegramChatConnectionInput = {
  telegramChatId: string;
  telegramId: string;
  title: string | null;
  token: string;
};

export type TelegramChatConnection = {
  integrationId: string;
  status: "connected";
  telegramChatId: string;
  workspaceId: string;
};
