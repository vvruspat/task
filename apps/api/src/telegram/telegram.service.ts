import { Injectable } from "@nestjs/common";
import type {
  ResolveTelegramContextInput,
  TelegramContextResolution,
} from "./telegram.contracts.js";
import { TelegramContextResolutionDto } from "./telegram.dto.js";
import type { TelegramContextStore } from "./telegram.store.js";

@Injectable()
export class TelegramService {
  constructor(private readonly telegramContextStore: TelegramContextStore) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolutionDto> {
    const resolution = await this.telegramContextStore.resolveContext(input);

    return new TelegramContextResolutionDto(resolution);
  }
}

export type { ResolveTelegramContextInput, TelegramContextResolution };
