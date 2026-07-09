import { Module, type Provider } from "@nestjs/common";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { loadApiConfig } from "../config.js";
import { ConfirmationsModule } from "../confirmations/confirmations.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { TelegramController, TelegramMiniAppController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";
import { TelegramMiniAppInitDataVerifier } from "./telegram-mini-app-init-data.verifier.js";
import { TypeOrmTelegramContextStore } from "./typeorm-telegram-context.store.js";

const telegramMiniAppMaxAgeSeconds = 86_400;

const telegramMiniAppInitDataVerifierProvider: Provider<TelegramMiniAppInitDataVerifier> = {
  provide: TelegramMiniAppInitDataVerifier,
  useFactory: (): TelegramMiniAppInitDataVerifier => {
    const config = loadApiConfig().telegramMiniApp;

    return new TelegramMiniAppInitDataVerifier({
      botToken: config?.botToken ?? null,
      maxAgeSeconds: telegramMiniAppMaxAgeSeconds,
      now: () => new Date(),
    });
  },
};

const telegramServiceProvider: Provider<TelegramService> = {
  provide: TelegramService,
  useFactory: (
    telegramContextStore: TelegramContextStore,
    miniAppInitDataVerifier: TelegramMiniAppInitDataVerifier,
  ): TelegramService => new TelegramService(telegramContextStore, miniAppInitDataVerifier),
  inject: [TypeOrmTelegramContextStore, TelegramMiniAppInitDataVerifier],
};

@Module({
  imports: [DatabaseModule, ConfirmationsModule],
  controllers: [TelegramController, TelegramMiniAppController],
  providers: [
    BotSharedSecretGuard,
    TypeOrmTelegramContextStore,
    telegramMiniAppInitDataVerifierProvider,
    telegramServiceProvider,
  ],
})
export class TelegramModule {}
