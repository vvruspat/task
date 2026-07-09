import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  AttachmentEntity,
  ProjectEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  TaskAttachment,
} from "./attachments.contracts.js";
import type { TaskAttachmentCreateResult, TaskAttachmentsStore } from "./attachments.store.js";

const attachmentWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set([
  "owner",
  "admin",
  "member",
]);

@Injectable()
export class TypeOrmTaskAttachmentsStore implements TaskAttachmentsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskAttachment[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadTask = await this.canReadTask(dataSource, workspaceId, projectId, taskId, userId);

    if (!canReadTask) {
      return null;
    }

    const attachments = await dataSource.getRepository(AttachmentEntity).find({
      where: { targetId: taskId, targetType: "task", workspaceId },
      order: { createdAt: "ASC" },
    });

    return attachments.map(toTaskAttachment);
  }

  async createLinkForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskLinkAttachmentInput,
  ): Promise<TaskAttachmentCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!attachmentWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const savedAttachment = await dataSource.transaction(
      async (manager): Promise<AttachmentEntity> => {
        const attachmentRepository = manager.getRepository(AttachmentEntity);
        const attachment = attachmentRepository.create({
          workspaceId,
          targetType: "task",
          targetId: taskId,
          kind: "link",
          title: input.title ?? null,
          url: input.url,
          createdByUserId: userId,
        });
        const createdAttachment = await attachmentRepository.save(attachment);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "attachment.created",
          entityType: "attachment",
          entityId: createdAttachment.id,
          payload: {
            kind: "link",
            projectId,
            taskId,
            targetType: "task",
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        return createdAttachment;
      },
    );

    return { attachment: toTaskAttachment(savedAttachment), status: "created" };
  }

  async createFileForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskFileAttachmentInput,
  ): Promise<TaskAttachmentCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!attachmentWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const savedAttachment = await dataSource.transaction(
      async (manager): Promise<AttachmentEntity> => {
        const attachmentRepository = manager.getRepository(AttachmentEntity);
        const attachment = attachmentRepository.create({
          workspaceId,
          targetType: "task",
          targetId: taskId,
          kind: "file",
          title: input.title ?? null,
          storageKey: input.storageKey,
          mimeType: input.mimeType ?? null,
          sizeBytes: input.sizeBytes ?? null,
          createdByUserId: userId,
        });
        const createdAttachment = await attachmentRepository.save(attachment);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "attachment.created",
          entityType: "attachment",
          entityId: createdAttachment.id,
          payload: {
            kind: "file",
            projectId,
            taskId,
            targetType: "task",
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        return createdAttachment;
      },
    );

    return { attachment: toTaskAttachment(savedAttachment), status: "created" };
  }

  private async canReadTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return false;
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    return task !== null;
  }

  private async getVisibleTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskEntity | null> {
    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return null;
    }

    return dataSource.getRepository(TaskEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskId,
      projectId,
      workspaceId,
    });
  }

  private async getWorkspaceMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity | null> {
    return dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toTaskAttachment(attachment: AttachmentEntity): TaskAttachment {
  return {
    id: attachment.id,
    workspaceId: attachment.workspaceId,
    targetType: attachment.targetType,
    targetId: attachment.targetId,
    kind: attachment.kind,
    title: attachment.title,
    url: attachment.url,
    storageKey: attachment.storageKey,
    telegramFileId: attachment.telegramFileId,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdByUserId: attachment.createdByUserId,
    createdAt: attachment.createdAt,
  };
}
