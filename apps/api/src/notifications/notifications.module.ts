import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import {
  NotificationsController,
  TaskSubscriptionsController,
} from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import type { NotificationsStore } from "./notifications.store.js";
import { TypeOrmNotificationsStore } from "./typeorm-notifications.store.js";

const notificationsServiceProvider: Provider<NotificationsService> = {
  provide: NotificationsService,
  useFactory: (store: NotificationsStore): NotificationsService => new NotificationsService(store),
  inject: [TypeOrmNotificationsStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController, TaskSubscriptionsController],
  providers: [TypeOrmNotificationsStore, notificationsServiceProvider],
})
export class NotificationsModule {}
