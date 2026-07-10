import type {
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
} from "./telegram.contracts.js";

export type TelegramContextStore = {
  getIdentityLinkStatus(userId: string): Promise<TelegramIdentityLinkStatus | null>;
  resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution>;
  linkIdentity(input: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult>;
};
