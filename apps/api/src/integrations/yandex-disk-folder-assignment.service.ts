import { randomUUID } from "node:crypto";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
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
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the client value at runtime.
import {
  YandexDiskApiError,
  YandexDiskClient,
  YandexDiskFolderSelectionError,
  type YandexDiskResource,
} from "./yandex-disk.client.js";
import { YandexDiskAccessError, YandexDiskAccessService } from "./yandex-disk-access.service.js";
import type {
  YandexDiskFolderAssignment,
  YandexDiskFolderTargetType,
} from "./yandex-disk-oauth.contracts.js";
import {
  YandexDiskFolderAssignmentDto,
  YandexDiskFolderAssignmentResponseDto,
} from "./yandex-disk-oauth.dto.js";
import { upsertYandexDiskFolderResource } from "./yandex-disk-root.service.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the sync service value at runtime.
import { YandexDiskSyncService } from "./yandex-disk-sync.service.js";

const yandexDiskPluginKey = "yandex-disk";

@Injectable()
export class YandexDiskFolderAssignmentService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    @Inject(YandexDiskAccessService)
    private readonly accessService: YandexDiskAccessService,
    private readonly diskClient: YandexDiskClient,
    private readonly syncService: YandexDiskSyncService,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async getAssignment(
    workspaceId: string,
    integrationId: string,
    targetType: YandexDiskFolderTargetType,
    targetId: string,
    userId: string,
  ): Promise<YandexDiskFolderAssignmentResponseDto> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
    await assertTargetExists(dataSource.manager, workspaceId, targetType, targetId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    const stored = await findFolderAssignment(
      dataSource.manager,
      grant.connectionId,
      targetType,
      targetId,
    );
    return new YandexDiskFolderAssignmentResponseDto({
      folder: stored === null ? null : toFolderAssignment(stored, targetType, targetId),
    });
  }

  async selectFolder(
    workspaceId: string,
    integrationId: string,
    targetType: YandexDiskFolderTargetType,
    targetId: string,
    path: string,
    userId: string,
  ): Promise<YandexDiskFolderAssignmentDto> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
    await assertTargetExists(dataSource.manager, workspaceId, targetType, targetId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    const folder = await this.getWritableFolder(grant.accessToken, path);
    const assignment = await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      await assertTargetExists(manager, workspaceId, targetType, targetId);
      const integration = await lockConnectedIntegration(
        manager,
        workspaceId,
        integrationId,
        grant.connectionId,
      );
      const resource = await upsertYandexDiskFolderResource(
        manager,
        grant.connectionId,
        folder,
        "selected",
      );
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
            eventType: "integration.yandex_disk.folder_assigned",
            payload: {
              externalResourceId: resource.id,
              integrationProvider: yandexDiskPluginKey,
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
        payload: { configuration: "managedFolder", pluginKey: yandexDiskPluginKey },
        workspaceId,
      });
      return toFolderAssignment(
        { linkMetadata: { assignmentSource: "selected" }, resource },
        targetType,
        targetId,
      );
    });
    if (targetType === "task") {
      await this.syncService.syncTaskFolder({
        accessToken: grant.accessToken,
        connectionId: grant.connectionId,
        folderPath: folder.path,
        taskId: targetId,
        workspaceId,
      });
    }
    return new YandexDiskFolderAssignmentDto(assignment);
  }

  private async getWritableFolder(accessToken: string, path: string): Promise<YandexDiskResource> {
    try {
      return await this.diskClient.getWritableFolder(accessToken, path);
    } catch (error: unknown) {
      if (error instanceof YandexDiskFolderSelectionError) {
        throw new BadRequestException("Select an existing Yandex Disk folder.");
      }
      if (error instanceof YandexDiskApiError)
        throw new BadGatewayException("Yandex Disk is unavailable.");
      throw error;
    }
  }

  private async getAccessGrant(
    workspaceId: string,
    integrationId: string,
  ): ReturnType<YandexDiskAccessService["getAccessGrant"]> {
    try {
      return await this.accessService.getAccessGrant(workspaceId, integrationId);
    } catch (error: unknown) {
      if (!(error instanceof YandexDiskAccessError)) throw error;
      if (error.code === "integration_not_found")
        throw new NotFoundException("Yandex Disk workspace integration was not found.");
      if (error.code === "integration_not_connected" || error.code === "connection_not_available") {
        throw new ConflictException("Yandex Disk workspace integration is not connected.");
      }
      if (error.code === "database_not_configured" || error.code === "credentials_not_available") {
        throw new ServiceUnavailableException("Yandex Disk credentials are not available.");
      }
      throw new BadGatewayException("Yandex Disk credentials could not be refreshed.");
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
  targetType: YandexDiskFolderTargetType,
  targetId: string,
): Promise<void> {
  const exists =
    targetType === "project"
      ? await manager
          .getRepository(ProjectEntity)
          .existsBy({ archivedAt: IsNull(), id: targetId, workspaceId })
      : await manager
          .getRepository(TaskEntity)
          .existsBy({ archivedAt: IsNull(), id: targetId, workspaceId });
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
  if (integration === null || integration.pluginKey !== yandexDiskPluginKey) {
    throw new NotFoundException("Yandex Disk workspace integration was not found.");
  }
  if (integration.status !== "connected")
    throw new ConflictException("Yandex Disk workspace integration is not connected.");
  const exists = await manager.getRepository(IntegrationConnectionEntity).existsBy({
    id: connectionId,
    status: "connected",
    workspaceIntegrationId: integration.id,
  });
  if (!exists) throw new ConflictException("Yandex Disk connection changed. Try again.");
  return integration;
}

async function replaceFolderLink(
  manager: EntityManager,
  connectionId: string,
  externalResourceId: string,
  targetType: YandexDiskFolderTargetType,
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
  targetType: YandexDiskFolderTargetType,
  targetId: string,
): Promise<void> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    externalResourceId,
    relation: "managed_container",
  });
  if (links.some((link) => link.targetType !== targetType || link.targetId !== targetId)) {
    throw new ConflictException("This Yandex Disk folder is already assigned elsewhere.");
  }
}

async function findFolderAssignment(
  manager: EntityManager,
  connectionId: string,
  targetType: YandexDiskFolderTargetType,
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
    resourceKind: "yandex-disk.folder",
    status: "active",
  });
  if (resources.length > 1)
    throw new ConflictException(`${targetType} has multiple Yandex Disk folders.`);
  const resource = resources[0];
  if (resource === undefined) return null;
  const link = links.find((candidate) => candidate.externalResourceId === resource.id);
  return link === undefined ? null : { linkMetadata: link.metadata, resource };
}

function toFolderAssignment(
  stored: StoredFolderAssignment,
  targetType: YandexDiskFolderTargetType,
  targetId: string,
): YandexDiskFolderAssignment {
  return {
    assignmentSource:
      stored.linkMetadata["assignmentSource"] === "selected" ? "selected" : "managed",
    externalResourceId: stored.resource.id,
    name: stored.resource.name,
    path: stored.resource.providerResourceId,
    providerResourceId: stored.resource.providerResourceId,
    targetId,
    targetType,
    webUrl: stored.resource.webUrl,
  };
}
