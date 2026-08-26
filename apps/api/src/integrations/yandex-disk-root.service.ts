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
import type { DataSource, EntityManager } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
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
  yandexDiskFolderMimeType,
} from "./yandex-disk.client.js";
import { YandexDiskAccessError, YandexDiskAccessService } from "./yandex-disk-access.service.js";
import { YandexDiskRootFolderDto } from "./yandex-disk-oauth.dto.js";

const yandexDiskPluginKey = "yandex-disk";

@Injectable()
export class YandexDiskRootService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    @Inject(YandexDiskAccessService)
    private readonly accessService: YandexDiskAccessService,
    private readonly diskClient: YandexDiskClient,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async selectRootFolder(
    workspaceId: string,
    integrationId: string,
    path: string,
    userId: string,
  ): Promise<YandexDiskRootFolderDto> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    const folder = await this.getWritableFolder(grant.accessToken, path);
    return await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository
        .createQueryBuilder("integration")
        .where("integration.id = :integrationId", { integrationId })
        .andWhere("integration.workspaceId = :workspaceId", { workspaceId })
        .setLock("pessimistic_write")
        .getOne();
      if (integration === null || integration.pluginKey !== yandexDiskPluginKey) {
        throw new NotFoundException("Yandex Disk workspace integration was not found.");
      }
      if (integration.status !== "connected") {
        throw new ConflictException("Yandex Disk workspace integration is not connected.");
      }
      const connection = await manager.getRepository(IntegrationConnectionEntity).findOneBy({
        id: grant.connectionId,
        status: "connected",
        workspaceIntegrationId: integration.id,
      });
      if (connection === null)
        throw new ConflictException("Yandex Disk connection changed. Try again.");
      const resource = await upsertFolderResource(manager, connection.id, folder, "selected");
      const linkRepository = manager.getRepository(IntegrationResourceLinkEntity);
      await linkRepository
        .createQueryBuilder()
        .delete()
        .where(`"target_type" = 'workspace'`)
        .andWhere(`"target_id" = :workspaceId`, { workspaceId })
        .andWhere(`"relation" = 'managed_root'`)
        .andWhere(
          `"external_resource_id" IN (SELECT "id" FROM "integration_external_resources" WHERE "connection_id" = :connectionId)`,
          { connectionId: connection.id },
        )
        .execute();
      await linkRepository.save(
        linkRepository.create({
          createdByUserId: userId,
          externalResourceId: resource.id,
          metadata: {},
          relation: "managed_root",
          targetId: workspaceId,
          targetType: "workspace",
        }),
      );
      const rootFolder = toRootFolder(resource);
      integration.config = { ...integration.config, rootFolder };
      await integrationRepository.save(integration);
      const now = new Date();
      await this.outboxPublisher.publishUsingManager(manager, {
        actorUserId: userId,
        entity: { id: integration.id, type: "workspace_integration" },
        id: randomUUID(),
        name: "integration.connected.v1",
        occurredAt: now.toISOString(),
        payload: { configuration: "rootFolder", pluginKey: yandexDiskPluginKey },
        workspaceId,
      });
      return new YandexDiskRootFolderDto(rootFolder);
    });
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

export async function upsertYandexDiskFolderResource(
  manager: EntityManager,
  connectionId: string,
  folder: YandexDiskResource,
  assignmentSource: "managed" | "selected",
): Promise<IntegrationExternalResourceEntity> {
  return await upsertFolderResource(manager, connectionId, folder, assignmentSource);
}

async function upsertFolderResource(
  manager: EntityManager,
  connectionId: string,
  folder: YandexDiskResource,
  assignmentSource: "managed" | "selected",
): Promise<IntegrationExternalResourceEntity> {
  const repository = manager.getRepository(IntegrationExternalResourceEntity);
  const resource =
    (await repository.findOneBy({ connectionId, providerResourceId: folder.path })) ??
    repository.create();
  resource.connectionId = connectionId;
  resource.lastSyncedAt = new Date();
  resource.metadata = { assignmentSource, path: folder.path };
  resource.mimeType = yandexDiskFolderMimeType;
  resource.modifiedAt = folder.modifiedAt === null ? null : new Date(folder.modifiedAt);
  resource.name = folder.name;
  resource.parentProviderResourceId = folder.parentId;
  resource.providerResourceId = folder.path;
  resource.resourceKind = "yandex-disk.folder";
  resource.status = "active";
  resource.version = folder.version;
  resource.webUrl = folder.webUrl;
  return await repository.save(resource);
}

function toRootFolder(resource: IntegrationExternalResourceEntity): {
  externalResourceId: string;
  name: string;
  path: string;
  providerResourceId: string;
  webUrl: string | null;
} {
  return {
    externalResourceId: resource.id,
    name: resource.name,
    path: resource.providerResourceId,
    providerResourceId: resource.providerResourceId,
    webUrl: resource.webUrl,
  };
}

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
