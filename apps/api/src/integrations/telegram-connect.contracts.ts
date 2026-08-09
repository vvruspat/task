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

export type CreateTelegramBrowserConnectIntentInput = {
  telegramChatId: string;
  telegramId: string;
  title: string | null;
};

export type TelegramBrowserConnectIntent = {
  loginUrl: string;
  expiresAt: Date;
};

export type TelegramBrowserConnectAuthInput = {
  authData: string;
};

export type CompleteTelegramBrowserConnectInput = TelegramBrowserConnectAuthInput & {
  workspaceId?: string;
};

export type TelegramBrowserConnectWorkspace = {
  id: string;
  name: string;
  slug: string;
};

export type TelegramBrowserConnectPreview = {
  mode: "link_identity" | "connect_chat";
  chatTitle: string | null;
  expiresAt: Date;
  workspace: TelegramBrowserConnectWorkspace | null;
  workspaces: TelegramBrowserConnectWorkspace[];
};

export type TelegramBrowserConnectResult = {
  status: "identity_linked" | "chat_connected";
  chatTitle: string | null;
  workspace: TelegramBrowserConnectWorkspace;
};
