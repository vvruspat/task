import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  LinkTelegramMiniAppIdentityInput,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  VerifyTelegramMiniAppInitDataInput,
} from "./telegram.contracts.js";
import {
  LinkedTelegramIdentityDto,
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

  async linkMiniAppIdentity(
    input: LinkTelegramMiniAppIdentityInput,
  ): Promise<LinkedTelegramIdentityDto> {
    const verifiedIdentity = this.miniAppInitDataVerifier.verify(input);
    const result = await this.telegramContextStore.linkIdentity({
      userId: input.userId,
      telegramId: verifiedIdentity.telegramId,
    });

    if (result.status === "user_not_found") {
      throw new NotFoundException("Current user was not found.");
    }

    if (result.status === "telegram_identity_linked_to_different_user") {
      throw new ConflictException("Telegram identity is already linked to another user.");
    }

    return new LinkedTelegramIdentityDto(result.identity);
  }
}

export type { ResolveTelegramContextInput, TelegramContextResolution };
