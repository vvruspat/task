import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AttachmentsController } from "./attachments.controller.js";
import { AttachmentsService } from "./attachments.service.js";
import type { TaskAttachmentsStore } from "./attachments.store.js";
import { TypeOrmTaskAttachmentsStore } from "./typeorm-task-attachments.store.js";

const attachmentsServiceProvider: Provider<AttachmentsService> = {
  provide: AttachmentsService,
  useFactory: (attachmentsStore: TaskAttachmentsStore): AttachmentsService =>
    new AttachmentsService(attachmentsStore),
  inject: [TypeOrmTaskAttachmentsStore],
};

@Module({
  imports: [DatabaseModule],
  controllers: [AttachmentsController],
  providers: [TypeOrmTaskAttachmentsStore, attachmentsServiceProvider],
})
export class AttachmentsModule {}
