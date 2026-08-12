import { Module, type Provider } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import {
  type AttachmentContentProvider,
  attachmentContentProviderToken,
} from "../integrations/attachment-content.provider.js";
import {
  type AttachmentContentConfig,
  IntegrationsConfigProvider,
} from "../integrations/integrations.config.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import {
  type AttachmentUploadStore,
  attachmentUploadStoreToken,
} from "./attachment-upload.store.js";
import { AttachmentsController } from "./attachments.controller.js";
import { AttachmentsService } from "./attachments.service.js";
import type { TaskAttachmentsStore } from "./attachments.store.js";
import { LocalAttachmentUploadStore } from "./local-attachment-upload.store.js";
import { TaskFileUploadService } from "./task-file-upload.service.js";
import { TypeOrmTaskAttachmentsStore } from "./typeorm-task-attachments.store.js";

const attachmentsServiceProvider: Provider<AttachmentsService> = {
  provide: AttachmentsService,
  useFactory: (attachmentsStore: TaskAttachmentsStore): AttachmentsService =>
    new AttachmentsService(attachmentsStore),
  inject: [TypeOrmTaskAttachmentsStore],
};

const attachmentUploadStoreProvider: Provider<AttachmentUploadStore> = {
  provide: attachmentUploadStoreToken,
  useFactory: (configProvider: IntegrationsConfigProvider): AttachmentUploadStore => {
    const config: AttachmentContentConfig = configProvider.getConfig().attachmentContent;
    return new LocalAttachmentUploadStore(config);
  },
  inject: [IntegrationsConfigProvider],
};

const taskFileUploadServiceProvider: Provider<TaskFileUploadService> = {
  provide: TaskFileUploadService,
  useFactory: (
    uploadStore: AttachmentUploadStore,
    contentProvider: AttachmentContentProvider,
    attachmentsService: AttachmentsService,
  ): TaskFileUploadService =>
    new TaskFileUploadService(uploadStore, contentProvider, attachmentsService),
  inject: [attachmentUploadStoreToken, attachmentContentProviderToken, AttachmentsService],
};

@Module({
  imports: [DatabaseModule, IntegrationsModule],
  controllers: [AttachmentsController],
  providers: [
    TypeOrmTaskAttachmentsStore,
    attachmentsServiceProvider,
    attachmentUploadStoreProvider,
    taskFileUploadServiceProvider,
  ],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
