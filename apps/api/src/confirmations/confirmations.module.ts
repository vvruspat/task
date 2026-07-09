import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ConfirmationsController } from "./confirmations.controller.js";
import { ConfirmationsService } from "./confirmations.service.js";
import type { ConfirmationRequestsStore } from "./confirmations.store.js";
import { TypeOrmConfirmationRequestsStore } from "./typeorm-confirmation-requests.store.js";

const confirmationsServiceProvider: Provider<ConfirmationsService> = {
  provide: ConfirmationsService,
  useFactory: (store: ConfirmationRequestsStore): ConfirmationsService =>
    new ConfirmationsService(store),
  inject: [TypeOrmConfirmationRequestsStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [ConfirmationsController],
  providers: [TypeOrmConfirmationRequestsStore, confirmationsServiceProvider],
  exports: [ConfirmationsService],
})
export class ConfirmationsModule {}
