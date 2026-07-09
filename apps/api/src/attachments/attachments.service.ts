import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
} from "./attachments.contracts.js";
import { TaskAttachmentDto } from "./attachments.dto.js";
import type { TaskAttachmentsStore } from "./attachments.store.js";

@Injectable()
export class AttachmentsService {
  constructor(private readonly attachmentsStore: TaskAttachmentsStore) {}

  async listTaskAttachments(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskAttachmentDto[]> {
    const attachments = await this.attachmentsStore.listForTask(
      workspaceId,
      projectId,
      taskId,
      userId,
    );

    if (attachments === null) {
      throw new NotFoundException("Task was not found.");
    }

    return attachments.map((attachment) => new TaskAttachmentDto(attachment));
  }

  async createTaskLinkAttachment(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskLinkAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    const result = await this.attachmentsStore.createLinkForTask(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );

    if (result.status === "task_not_found") {
      throw new NotFoundException("Task was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot attach links to tasks in this workspace.");
    }

    return new TaskAttachmentDto(result.attachment);
  }

  async createTaskFileAttachment(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskFileAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    const result = await this.attachmentsStore.createFileForTask(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );

    if (result.status === "task_not_found") {
      throw new NotFoundException("Task was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot attach files to tasks in this workspace.");
    }

    return new TaskAttachmentDto(result.attachment);
  }

  async createTaskTelegramFileAttachment(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskTelegramFileAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    const result = await this.attachmentsStore.createTelegramFileForTask(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );

    if (result.status === "task_not_found") {
      throw new NotFoundException("Task was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException(
        "Current user cannot attach Telegram files to tasks in this workspace.",
      );
    }

    return new TaskAttachmentDto(result.attachment);
  }
}
