import { Module, type Provider } from "@nestjs/common";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { ConfirmationsModule } from "../confirmations/confirmations.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";
import type { TelegramContextStore } from "./telegram.store.js";
import { TypeOrmTelegramContextStore } from "./typeorm-telegram-context.store.js";

const telegramServiceProvider: Provider<TelegramService> = {
  provide: TelegramService,
  useFactory: (telegramContextStore: TelegramContextStore): TelegramService =>
    new TelegramService(telegramContextStore),
  inject: [TypeOrmTelegramContextStore],
};

@Module({
  imports: [DatabaseModule, ConfirmationsModule],
  controllers: [TelegramController],
  providers: [BotSharedSecretGuard, TypeOrmTelegramContextStore, telegramServiceProvider],
})
export class TelegramModule {}
