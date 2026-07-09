import type {
  LinkTelegramIdentityInput,
  LinkTelegramIdentityResult,
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";

export type TelegramContextStore = {
  resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution>;
  linkIdentity(input: LinkTelegramIdentityInput): Promise<LinkTelegramIdentityResult>;
};
