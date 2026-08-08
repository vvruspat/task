import type {
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ReadTelegramChatHistoryInput,
  ReadTelegramChatHistoryResult,
  RecordTelegramChatMessageInput,
  RecordTelegramChatMessageResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
} from "./telegram.contracts.js";

export type TelegramContextStore = {
  getIdentityLinkStatus(userId: string): Promise<TelegramIdentityLinkStatus | null>;
  resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution>;
  linkIdentity(input: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult>;
  recordChatMessage(
    input: RecordTelegramChatMessageInput,
  ): Promise<RecordTelegramChatMessageResult>;
  readChatHistory(input: ReadTelegramChatHistoryInput): Promise<ReadTelegramChatHistoryResult>;
};
