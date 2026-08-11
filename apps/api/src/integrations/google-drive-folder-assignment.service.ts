import { randomUUID } from "node:crypto";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { type DataSource, type EntityManager, In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  IntegrationConnectionEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  ProjectEntity,
  TaskEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the Drive client value at runtime.
import {
  GoogleDriveApiError,
  GoogleDriveClient,
  type GoogleDriveFile,
  type GoogleDriveFolder,
  GoogleDriveFolderSelectionError,
  googleDriveFolderMimeType,
} from "./google-drive.client.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the access service value at runtime.
import { GoogleDriveAccessError, GoogleDriveAccessService } from "./google-drive-access.service.js";
import type { GoogleDriveChange } from "./google-drive-changes.client.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the client value at runtime.
import { GoogleDriveChangesClient } from "./google-drive-changes.client.js";
import type {
  GoogleDriveFolderAssignment,
  GoogleDriveFolderTargetType,
} from "./google-drive-oauth.contracts.js";
import {
  GoogleDriveFolderAssignmentDto,
  GoogleDriveFolderAssignmentResponseDto,
} from "./google-drive-oauth.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the store value at runtime.
import { TypeOrmGoogleDriveChangeStore } from "./typeorm-google-drive-change.store.js";

const googleDrivePluginKey = "google-drive";

@Injectable()
export class GoogleDriveFolderAssignmentService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly accessService: GoogleDriveAccessService,
    private readonly driveClient: GoogleDriveClient,
    private readonly changesClient: GoogleDriveChangesClient,
    private readonly changeStore: TypeOrmGoogleDriveChangeStore,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async getAssignment(
    workspaceId: string,
    integrationId: string,
    targetType: GoogleDriveFolderTargetType,
    targetId: string,
    userId: string,
  ): Promise<GoogleDriveFolderAssignmentResponseDto> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
    await assertTargetExists(dataSource.manager, workspaceId, targetType, targetId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    const assignment = await findFolderAssignment(
      dataSource.manager,
      grant.connectionId,
      targetType,
      targetId,
    );
    return new GoogleDriveFolderAssignmentResponseDto({
      folder: assignment === null ? null : toFolderAssignment(assignment, targetType, targetId),
    });
  }

  async selectFolder(
    workspaceId: string,
    integrationId: string,
    targetType: GoogleDriveFolderTargetType,
    targetId: string,
    folderId: string,
    userId: string,
  ): Promise<GoogleDriveFolderAssignmentDto> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
    await assertTargetExists(dataSource.manager, workspaceId, targetType, targetId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    const folder = await this.getWritableFolder(grant.accessToken, folderId);
    const initialSync =
      targetType === "task"
        ? await this.prepareInitialTaskFolderSync(grant.accessToken, folder.id)
        : null;
    const assignment = await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      await assertTargetExists(manager, workspaceId, targetType, targetId);
      const integration = await lockConnectedIntegration(
        manager,
        workspaceId,
        integrationId,
        grant.connectionId,
      );
      const resource = await upsertFolderResource(manager, grant.connectionId, folder);
      await assertFolderAvailableForTarget(manager, resource.id, targetType, targetId);
      await replaceFolderLink(
        manager,
        grant.connectionId,
        resource.id,
        targetType,
        targetId,
        userId,
      );
      const now = new Date();
      if (targetType === "task") {
        await manager.getRepository(ActivityEventEntity).save(
          manager.getRepository(ActivityEventEntity).create({
            actorUserId: userId,
            createdAt: now,
            entityId: targetId,
            entityType: "task",
            eventType: "integration.google_drive.folder_assigned",
            payload: {
              externalResourceId: resource.id,
              integrationProvider: googleDrivePluginKey,
              providerResourceId: resource.providerResourceId,
              resourceName: resource.name,
              taskId: targetId,
              webUrl: resource.webUrl,
            },
            workspaceId,
          }),
        );
      }
      await this.outboxPublisher.publishUsingManager(manager, {
        actorUserId: userId,
        entity: { id: integration.id, type: "workspace_integration" },
        id: randomUUID(),
        name: "integration.connected.v1",
        occurredAt: now.toISOString(),
        payload: {
          configuration: "managedFolder",
          pluginKey: googleDrivePluginKey,
          ...(initialSync === null ? {} : { providerCursor: initialSync.providerCursor }),
        },
        workspaceId,
      });
      return toFolderAssignment(
        { linkMetadata: { assignmentSource: "selected" }, resource },
        targetType,
        targetId,
      );
    });
    if (initialSync !== null && initialSync.changes.length > 0) {
      await this.changeStore.recordChanges({
        changes: initialSync.changes,
        connectionId: grant.connectionId,
        syncedAt: initialSync.syncedAt,
        workspaceId,
      });
    }
    return new GoogleDriveFolderAssignmentDto(assignment);
  }

  private async prepareInitialTaskFolderSync(
    accessToken: string,
    folderId: string,
  ): Promise<{
    changes: readonly GoogleDriveChange[];
    providerCursor: string;
    syncedAt: Date;
  }> {
    try {
      const providerCursor = await this.changesClient.getStartPageToken(accessToken);
      const files: GoogleDriveFile[] = [];
      let pageToken: string | null = null;
      do {
        const page = await this.driveClient.listFolderFiles(accessToken, folderId, pageToken);
        files.push(...page.files.filter((file) => file.mimeType !== googleDriveFolderMimeType));
        pageToken = page.nextPageToken;
      } while (pageToken !== null);
      const syncedAt = new Date();
      return {
        changes: files.map((file) => googleDriveFileToChange(file, syncedAt)),
        providerCursor,
        syncedAt,
      };
    } catch (error: unknown) {
      if (error instanceof GoogleDriveApiError) {
        throw new BadGatewayException("Google Drive folder contents are unavailable.");
      }
      throw error;
    }
  }

  private async getWritableFolder(
    accessToken: string,
    folderId: string,
  ): Promise<GoogleDriveFolder> {
    try {
      return await this.driveClient.getWritableFolder(accessToken, folderId);
    } catch (error: unknown) {
      if (error instanceof GoogleDriveFolderSelectionError) {
        throw new BadRequestException("Select a writable Google Drive folder.");
      }
      if (error instanceof GoogleDriveApiError) {
        throw new BadGatewayException("Google Drive is unavailable.");
      }
      throw error;
    }
  }

  private async getAccessGrant(
    workspaceId: string,
    integrationId: string,
  ): ReturnType<GoogleDriveAccessService["getAccessGrant"]> {
    try {
      return await this.accessService.getAccessGrant(workspaceId, integrationId);
    } catch (error: unknown) {
      if (!(error instanceof GoogleDriveAccessError)) throw error;
      if (error.code === "integration_not_found") {
        throw new NotFoundException("Google Drive workspace integration was not found.");
      }
      if (error.code === "integration_not_connected" || error.code === "connection_not_available") {
        throw new ConflictException("Google Drive workspace integration is not connected.");
      }
      if (error.code === "database_not_configured" || error.code === "credentials_not_available") {
        throw new ServiceUnavailableException("Google Drive credentials are not available.");
      }
      if (error.code === "oauth_failed" || error.code === "scope_missing") {
        throw new BadGatewayException("Google Drive credentials could not be refreshed.");
      }
      throw error;
    }
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
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

export function googleDriveFileToChange(file: GoogleDriveFile, syncedAt: Date): GoogleDriveChange {
  return {
    file: {
      id: file.id,
      mimeType: file.mimeType,
      modifiedAt: file.modifiedAt,
      name: file.name,
      parentId: file.parentId,
      trashed: false,
      version: file.version,
      webViewLink: file.webViewLink,
    },
    fileId: file.id,
    removed: false,
    time: file.modifiedAt ?? syncedAt.toISOString(),
  };
}

type StoredFolderAssignment = {
  linkMetadata: Readonly<Record<string, unknown>>;
  resource: IntegrationExternalResourceEntity;
};

async function assertWorkspaceManager(
  manager: EntityManager,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const membership = await manager
    .getRepository(WorkspaceMemberEntity)
    .findOneBy({ userId, workspaceId });
  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new ForbiddenException("Current user cannot manage workspace integrations.");
  }
}

async function assertTargetExists(
  manager: EntityManager,
  workspaceId: string,
  targetType: GoogleDriveFolderTargetType,
  targetId: string,
): Promise<void> {
  const exists =
    targetType === "project"
      ? await manager.getRepository(ProjectEntity).existsBy({
          archivedAt: IsNull(),
          id: targetId,
          workspaceId,
        })
      : await manager.getRepository(TaskEntity).existsBy({
          archivedAt: IsNull(),
          id: targetId,
          workspaceId,
        });
  if (!exists)
    throw new NotFoundException(`${targetType === "project" ? "Project" : "Task"} was not found.`);
}

async function lockConnectedIntegration(
  manager: EntityManager,
  workspaceId: string,
  integrationId: string,
  connectionId: string,
): Promise<WorkspaceIntegrationEntity> {
  const integration = await manager
    .getRepository(WorkspaceIntegrationEntity)
    .createQueryBuilder("integration")
    .where("integration.id = :integrationId", { integrationId })
    .andWhere("integration.workspaceId = :workspaceId", { workspaceId })
    .setLock("pessimistic_write")
    .getOne();
  if (integration === null || integration.pluginKey !== googleDrivePluginKey) {
    throw new NotFoundException("Google Drive workspace integration was not found.");
  }
  if (integration.status !== "connected") {
    throw new ConflictException("Google Drive workspace integration is not connected.");
  }
  const connectionExists = await manager.getRepository(IntegrationConnectionEntity).existsBy({
    id: connectionId,
    status: "connected",
    workspaceIntegrationId: integration.id,
  });
  if (!connectionExists) throw new ConflictException("Google Drive connection changed. Try again.");
  return integration;
}

async function upsertFolderResource(
  manager: EntityManager,
  connectionId: string,
  folder: GoogleDriveFolder,
): Promise<IntegrationExternalResourceEntity> {
  const repository = manager.getRepository(IntegrationExternalResourceEntity);
  const resource =
    (await repository.findOneBy({ connectionId, providerResourceId: folder.id })) ??
    repository.create();
  resource.connectionId = connectionId;
  resource.lastSyncedAt = new Date();
  resource.metadata = { assignmentSource: "selected" };
  resource.mimeType = googleDriveFolderMimeType;
  resource.modifiedAt = folder.modifiedAt === null ? null : new Date(folder.modifiedAt);
  resource.name = folder.name;
  resource.parentProviderResourceId = folder.parentId;
  resource.providerResourceId = folder.id;
  resource.resourceKind = "google-drive.folder";
  resource.status = "active";
  resource.version = folder.version;
  resource.webUrl = folder.webViewLink;
  return await repository.save(resource);
}

async function replaceFolderLink(
  manager: EntityManager,
  connectionId: string,
  externalResourceId: string,
  targetType: GoogleDriveFolderTargetType,
  targetId: string,
  userId: string,
): Promise<void> {
  const repository = manager.getRepository(IntegrationResourceLinkEntity);
  await repository
    .createQueryBuilder()
    .delete()
    .where(`"target_type" = :targetType`, { targetType })
    .andWhere(`"target_id" = :targetId`, { targetId })
    .andWhere(`"relation" = 'managed_container'`)
    .andWhere(
      `"external_resource_id" IN (SELECT "id" FROM "integration_external_resources" WHERE "connection_id" = :connectionId)`,
      { connectionId },
    )
    .execute();
  await repository.save(
    repository.create({
      createdByUserId: userId,
      externalResourceId,
      metadata: { assignmentSource: "selected" },
      relation: "managed_container",
      targetId,
      targetType,
    }),
  );
}

async function assertFolderAvailableForTarget(
  manager: EntityManager,
  externalResourceId: string,
  targetType: GoogleDriveFolderTargetType,
  targetId: string,
): Promise<void> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    externalResourceId,
    relation: "managed_container",
  });
  const conflicts = links.some(
    (link) => link.targetType !== targetType || link.targetId !== targetId,
  );
  if (conflicts) {
    throw new ConflictException("This Google Drive folder is already assigned elsewhere.");
  }
}

async function findFolderAssignment(
  manager: EntityManager,
  connectionId: string,
  targetType: GoogleDriveFolderTargetType,
  targetId: string,
): Promise<StoredFolderAssignment | null> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    relation: "managed_container",
    targetId,
    targetType,
  });
  if (links.length === 0) return null;
  const resources = await manager.getRepository(IntegrationExternalResourceEntity).findBy({
    connectionId,
    id: In(links.map((link) => link.externalResourceId)),
    resourceKind: "google-drive.folder",
    status: "active",
  });
  if (resources.length > 1)
    throw new ConflictException(`${targetType} has multiple Google Drive folders.`);
  const resource = resources[0];
  if (resource === undefined) return null;
  const link = links.find((candidate) => candidate.externalResourceId === resource.id);
  if (link === undefined) return null;
  return { linkMetadata: link.metadata, resource };
}

function toFolderAssignment(
  stored: StoredFolderAssignment,
  targetType: GoogleDriveFolderTargetType,
  targetId: string,
): GoogleDriveFolderAssignment {
  return {
    assignmentSource:
      stored.linkMetadata["assignmentSource"] === "selected" ? "selected" : "managed",
    externalResourceId: stored.resource.id,
    name: stored.resource.name,
    providerResourceId: stored.resource.providerResourceId,
    targetId,
    targetType,
    webUrl: stored.resource.webUrl,
  };
}
