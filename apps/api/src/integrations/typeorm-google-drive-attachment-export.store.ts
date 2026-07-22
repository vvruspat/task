import { Injectable } from "@nestjs/common";
import { type DataSource, type EntityManager, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AttachmentEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
} from "../persistence/entities/index.js";
import type { GoogleDriveFile } from "./google-drive.client.js";
import type {
  GoogleDriveAttachmentExportReservation,
  GoogleDriveAttachmentExportStore,
  GoogleDriveExportableAttachment,
  ReserveGoogleDriveAttachmentExportInput,
} from "./google-drive-attachment-export.contracts.js";

const googleDriveFileResourceKind = "google-drive.file";

@Injectable()
export class TypeOrmGoogleDriveAttachmentExportStore implements GoogleDriveAttachmentExportStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async findAttachment(
    workspaceId: string,
    attachmentId: string,
  ): Promise<GoogleDriveExportableAttachment | null> {
    const dataSource = await this.getInitializedDataSource();
    const attachment = await dataSource.getRepository(AttachmentEntity).findOneBy({
      id: attachmentId,
      targetType: "task",
      workspaceId,
    });
    return attachment === null ? null : toExportableAttachment(attachment);
  }

  async findReservation(
    connectionId: string,
    attachmentId: string,
  ): Promise<GoogleDriveAttachmentExportReservation | null> {
    const dataSource = await this.getInitializedDataSource();
    const resource = await findLinkedExport(dataSource.manager, connectionId, attachmentId);
    return resource === null ? null : toReservation(resource);
  }

  async listAttachmentIds(workspaceId: string): Promise<readonly string[]> {
    const dataSource = await this.getInitializedDataSource();
    const attachments = await dataSource.getRepository(AttachmentEntity).find({
      order: { createdAt: "ASC", id: "ASC" },
      select: { id: true },
      where: { kind: In(["file", "telegram_file"]), targetType: "task", workspaceId },
    });
    return attachments.map((attachment) => attachment.id);
  }

  async reserve(
    input: ReserveGoogleDriveAttachmentExportInput,
  ): Promise<GoogleDriveAttachmentExportReservation> {
    const dataSource = await this.getInitializedDataSource();
    return dataSource.transaction(async (manager) => {
      const attachment = await manager
        .getRepository(AttachmentEntity)
        .createQueryBuilder("attachment")
        .where("attachment.id = :attachmentId", { attachmentId: input.attachmentId })
        .andWhere("attachment.workspaceId = :workspaceId", { workspaceId: input.workspaceId })
        .setLock("pessimistic_write")
        .getOne();
      if (attachment === null) {
        throw new Error(`Attachment ${input.attachmentId} was not found while reserving export.`);
      }
      const existing = await findLinkedExport(manager, input.connectionId, input.attachmentId);
      if (existing !== null) return toReservation(existing);

      const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
      const resource = resourceRepository.create({
        connectionId: input.connectionId,
        lastSyncedAt: new Date(),
        metadata: { attachmentId: input.attachmentId, provisioningState: "reserved" },
        mimeType: input.mimeType,
        modifiedAt: null,
        name: input.name,
        parentProviderResourceId: input.parentId,
        providerResourceId: input.fileId,
        resourceKind: googleDriveFileResourceKind,
        status: "unavailable",
        version: null,
        webUrl: null,
      });
      await resourceRepository.save(resource);
      const linkRepository = manager.getRepository(IntegrationResourceLinkEntity);
      await linkRepository.save(
        linkRepository.create({
          createdByUserId: input.actorUserId,
          externalResourceId: resource.id,
          metadata: {},
          relation: "export",
          targetId: input.attachmentId,
          targetType: "attachment",
        }),
      );
      return toReservation(resource);
    });
  }

  async markActive(
    connectionId: string,
    resourceId: string,
    attachmentId: string,
    file: GoogleDriveFile,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource.getRepository(IntegrationExternalResourceEntity).update(
      { connectionId, id: resourceId },
      {
        lastSyncedAt: new Date(),
        metadata: { attachmentId, provisioningState: "ready" },
        mimeType: file.mimeType,
        modifiedAt: file.modifiedAt === null ? null : new Date(file.modifiedAt),
        name: file.name,
        parentProviderResourceId: file.parentId,
        providerResourceId: file.id,
        resourceKind: googleDriveFileResourceKind,
        status: "active",
        version: file.version,
        webUrl: file.webViewLink,
      },
    );
    if (result.affected !== 1) {
      throw new Error(`Google Drive attachment mapping ${resourceId} was lost.`);
    }
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new Error("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

async function findLinkedExport(
  manager: EntityManager,
  connectionId: string,
  attachmentId: string,
): Promise<IntegrationExternalResourceEntity | null> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    relation: "export",
    targetId: attachmentId,
    targetType: "attachment",
  });
  if (links.length === 0) return null;
  const resources = await manager.getRepository(IntegrationExternalResourceEntity).findBy({
    connectionId,
    id: In(links.map((link) => link.externalResourceId)),
    resourceKind: googleDriveFileResourceKind,
  });
  if (resources.length > 1) {
    throw new Error(`Attachment ${attachmentId} has multiple Google Drive exports.`);
  }
  return resources[0] ?? null;
}

function toExportableAttachment(attachment: AttachmentEntity): GoogleDriveExportableAttachment {
  if (attachment.targetType !== "task") {
    throw new Error(`Attachment ${attachment.id} is not attached to a task.`);
  }
  return {
    id: attachment.id,
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    storageKey: attachment.storageKey,
    targetId: attachment.targetId,
    targetType: "task",
    telegramFileId: attachment.telegramFileId,
    title: attachment.title,
    workspaceId: attachment.workspaceId,
  };
}

function toReservation(
  resource: IntegrationExternalResourceEntity,
): GoogleDriveAttachmentExportReservation {
  const mimeType = resource.mimeType;
  const parentId = resource.parentProviderResourceId;
  if (mimeType === null || parentId === null) {
    throw new Error(`Google Drive export ${resource.id} has incomplete metadata.`);
  }
  return {
    fileId: resource.providerResourceId,
    mimeType,
    name: resource.name,
    parentId,
    resourceId: resource.id,
    status: resource.status === "active" ? "active" : "reserved",
  };
}
