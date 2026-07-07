import type {
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";

export type TelegramContextStore = {
  resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolution>;
};
