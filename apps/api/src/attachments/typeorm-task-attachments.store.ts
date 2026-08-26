import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  AttachmentEntity,
  IntegrationConnectionEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  ProjectEntity,
  TaskEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
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

  async authorizeFileUpload(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<"allowed" | "forbidden" | "task_not_found"> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);
    if (membership === null) return "task_not_found";
    if (!attachmentWriteRoles.has(membership.role)) return "forbidden";
    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);
    return task === null ? "task_not_found" : "allowed";
  }

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

    const externalFiles = await this.listExternalFilesForTask(dataSource, workspaceId, taskId);
    return [...attachments.map(toTaskAttachment), ...externalFiles].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
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

  async createTelegramFileForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskTelegramFileAttachmentInput,
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
          kind: "telegram_file",
          title: input.title ?? null,
          telegramFileId: input.telegramFileId,
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
            kind: "telegram_file",
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

  private async listExternalFilesForTask(
    dataSource: DataSource,
    workspaceId: string,
    taskId: string,
  ): Promise<TaskAttachment[]> {
    const integrations = await dataSource.getRepository(WorkspaceIntegrationEntity).find({
      select: { id: true },
      where: { pluginKey: In(["google-drive", "yandex-disk"]), workspaceId },
    });
    if (integrations.length === 0) return [];
    const connections = await dataSource.getRepository(IntegrationConnectionEntity).find({
      select: { id: true },
      where: { workspaceIntegrationId: In(integrations.map((integration) => integration.id)) },
    });
    if (connections.length === 0) return [];
    const links = await dataSource.getRepository(IntegrationResourceLinkEntity).findBy({
      relation: "reference",
      targetId: taskId,
      targetType: "task",
    });
    const discoveredLinks = links.filter(
      (link) => link.metadata["discoveredFrom"] === "managed_container",
    );
    if (discoveredLinks.length === 0) return [];
    const resources = await dataSource.getRepository(IntegrationExternalResourceEntity).findBy({
      connectionId: In(connections.map((connection) => connection.id)),
      id: In(discoveredLinks.map((link) => link.externalResourceId)),
      resourceKind: In(["google-drive.file", "yandex-disk.file"]),
      status: "active",
    });
    const linkByResourceId = new Map(
      discoveredLinks.map((link) => [link.externalResourceId, link]),
    );
    return resources.map((resource) =>
      toExternalTaskAttachment(resource, linkByResourceId.get(resource.id), workspaceId, taskId),
    );
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
    externalResourceId: null,
    modifiedAt: null,
    providerResourceId: null,
    source: "native",
  };
}

function toExternalTaskAttachment(
  resource: IntegrationExternalResourceEntity,
  link: IntegrationResourceLinkEntity | undefined,
  workspaceId: string,
  taskId: string,
): TaskAttachment {
  if (link === undefined) throw new Error(`External file ${resource.id} has no task link.`);
  const sizeBytes = readExternalSizeBytes(resource.metadata["sizeBytes"]);
  return {
    createdAt: resource.createdAt,
    createdByUserId: link.createdByUserId,
    externalResourceId: resource.id,
    id: resource.id,
    kind: "link",
    mimeType: resource.mimeType,
    modifiedAt: resource.modifiedAt,
    providerResourceId: resource.providerResourceId,
    sizeBytes,
    source: resource.resourceKind === "yandex-disk.file" ? "yandex_disk" : "google_drive",
    storageKey: null,
    targetId: taskId,
    targetType: "task",
    telegramFileId: null,
    title: resource.name,
    url: resource.webUrl,
    workspaceId,
  };
}

function readExternalSizeBytes(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/u.test(value)) return value;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? String(value)
    : null;
}
