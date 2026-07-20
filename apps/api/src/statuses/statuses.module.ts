import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { StatusesController } from "./statuses.controller.js";
import { StatusesService } from "./statuses.service.js";
import type { StatusesReadStore, StatusesWriteStore } from "./statuses.store.js";
import { TypeOrmStatusesReadStore } from "./typeorm-statuses-read.store.js";

const statusesServiceProvider: Provider<StatusesService> = {
  provide: StatusesService,
  useFactory: (readStore: StatusesReadStore, writeStore: StatusesWriteStore): StatusesService =>
    new StatusesService(readStore, writeStore),
  inject: [TypeOrmStatusesReadStore, TypeOrmStatusesReadStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [StatusesController],
  providers: [TypeOrmStatusesReadStore, statusesServiceProvider],
  exports: [StatusesService],
})
export class StatusesModule {}
