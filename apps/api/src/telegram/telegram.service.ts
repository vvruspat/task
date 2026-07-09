import { Injectable } from "@nestjs/common";
import type {
  ResolveTelegramContextInput,
  TelegramContextResolution,
  VerifyTelegramMiniAppInitDataInput,
} from "./telegram.contracts.js";
import {
  TelegramContextResolutionDto,
  VerifiedTelegramMiniAppInitDataDto,
} from "./telegram.dto.js";
import type { TelegramContextStore } from "./telegram.store.js";
import type { TelegramMiniAppInitDataVerifier } from "./telegram-mini-app-init-data.verifier.js";

@Injectable()
export class TelegramService {
  constructor(
    private readonly telegramContextStore: TelegramContextStore,
    private readonly miniAppInitDataVerifier: TelegramMiniAppInitDataVerifier,
  ) {}

  async resolveContext(input: ResolveTelegramContextInput): Promise<TelegramContextResolutionDto> {
    const resolution = await this.telegramContextStore.resolveContext(input);

    return new TelegramContextResolutionDto(resolution);
  }

  verifyMiniAppInitData(
    input: VerifyTelegramMiniAppInitDataInput,
  ): VerifiedTelegramMiniAppInitDataDto {
    return new VerifiedTelegramMiniAppInitDataDto(this.miniAppInitDataVerifier.verify(input));
  }
}

export type { ResolveTelegramContextInput, TelegramContextResolution };
