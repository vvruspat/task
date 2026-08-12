import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  type AttachmentContentProvider,
  AttachmentContentUnavailableError,
  attachmentContentProviderToken,
} from "../integrations/attachment-content.provider.js";
import {
  type AttachmentUploadStore,
  attachmentUploadStoreToken,
} from "./attachment-upload.store.js";
import type {
  TaskAttachment,
  TaskFileContent,
  TaskFileUploadInput,
} from "./attachments.contracts.js";
import type { TaskAttachmentDto } from "./attachments.dto.js";
import type { AttachmentsService } from "./attachments.service.js";

type TaskAttachmentCreator = Pick<
  AttachmentsService,
  "authorizeTaskFileUpload" | "createTaskFileAttachment" | "listTaskAttachments"
>;

@Injectable()
export class TaskFileUploadService {
  constructor(
    @Inject(attachmentUploadStoreToken)
    private readonly uploadStore: AttachmentUploadStore,
    @Inject(attachmentContentProviderToken)
    private readonly contentProvider: AttachmentContentProvider,
    private readonly attachmentsService: TaskAttachmentCreator,
  ) {}

  async upload(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: TaskFileUploadInput,
  ): Promise<TaskAttachmentDto> {
    await this.attachmentsService.authorizeTaskFileUpload(workspaceId, projectId, taskId, userId);
    const stored = await this.uploadStore.store({ bytes: input.bytes, taskId, workspaceId });
    try {
      return await this.attachmentsService.createTaskFileAttachment(
        workspaceId,
        projectId,
        taskId,
        userId,
        {
          mimeType: input.mimeType,
          sizeBytes: stored.sizeBytes,
          storageKey: stored.storageKey,
          title: input.fileName,
        },
      );
    } catch (error) {
      await this.uploadStore.remove(stored.storageKey);
      throw error;
    }
  }

  async read(
    workspaceId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
    userId: string,
  ): Promise<TaskFileContent> {
    const attachments = await this.attachmentsService.listTaskAttachments(
      workspaceId,
      projectId,
      taskId,
      userId,
    );
    const attachment = attachments.find(
      (candidate) =>
        candidate.id === attachmentId &&
        candidate.kind === "file" &&
        candidate.source === "native" &&
        candidate.storageKey !== null,
    );
    if (attachment === undefined) throw new NotFoundException("Task file was not found.");
    try {
      const content = await this.contentProvider.read(toContentSource(attachment));
      if (content === null) throw new NotFoundException("Task file was not found.");
      return content;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof AttachmentContentUnavailableError) {
        throw new ServiceUnavailableException("Task file content is unavailable.");
      }
      throw error;
    }
  }
}

function toContentSource(attachment: TaskAttachment): TaskAttachment {
  if (attachment.storageKey === null) {
    throw new BadRequestException("Task file has no storage key.");
  }
  return attachment;
}
