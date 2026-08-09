import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  LinkTelegramMiniAppIdentityInput,
  ReadTelegramChatHistoryInput,
  ReadTelegramChatHistoryResult,
  RecordTelegramChatMessageInput,
  ResolveTelegramContextInput,
  TelegramContextResolution,
  TelegramIdentityLinkStatus,
  VerifyTelegramMiniAppInitDataInput,
} from "./telegram.contracts.js";
import {
  LinkedTelegramIdentityDto,
  RecordTelegramChatMessageResultDto,
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

  async recordChatMessage(
    input: RecordTelegramChatMessageInput,
  ): Promise<RecordTelegramChatMessageResultDto> {
    return new RecordTelegramChatMessageResultDto(
      await this.telegramContextStore.recordChatMessage(input),
    );
  }

  async readChatHistory(
    input: ReadTelegramChatHistoryInput,
  ): Promise<ReadTelegramChatHistoryResult> {
    return this.telegramContextStore.readChatHistory(input);
  }

  verifyMiniAppInitData(
    input: VerifyTelegramMiniAppInitDataInput,
  ): VerifiedTelegramMiniAppInitDataDto {
    return new VerifiedTelegramMiniAppInitDataDto(this.miniAppInitDataVerifier.verify(input));
  }

  async getMiniAppIdentityLinkStatus(userId: string): Promise<TelegramIdentityLinkStatus | null> {
    return this.telegramContextStore.getIdentityLinkStatus(userId);
  }

  async linkMiniAppIdentity(
    input: LinkTelegramMiniAppIdentityInput,
  ): Promise<LinkedTelegramIdentityDto> {
    const verifiedIdentity = this.miniAppInitDataVerifier.verify(input);
    const result = await this.telegramContextStore.linkIdentity({
      userId: input.userId,
      telegramId: verifiedIdentity.telegramId,
      telegramUsername: verifiedIdentity.telegramUsername,
      firstName: verifiedIdentity.firstName,
      lastName: verifiedIdentity.lastName,
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
