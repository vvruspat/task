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
// biome-ignore lint/style/useImportType: Nest constructor injection needs the Drive client value at runtime.
import {
  GoogleDriveApiError,
  GoogleDriveClient,
  type GoogleDriveFolder,
  GoogleDriveFolderSelectionError,
  googleDriveFolderMimeType,
} from "./google-drive.client.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the access service value at runtime.
import { GoogleDriveAccessError, GoogleDriveAccessService } from "./google-drive-access.service.js";
import { GoogleDrivePickerSessionDto, GoogleDriveRootFolderDto } from "./google-drive-oauth.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the publisher value at runtime.
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the config provider value at runtime.
import { IntegrationsConfigProvider } from "./integrations.config.js";

const googleDrivePluginKey = "google-drive";
@Injectable()
export class GoogleDriveRootService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly configProvider: IntegrationsConfigProvider,
    private readonly accessService: GoogleDriveAccessService,
    private readonly driveClient: GoogleDriveClient,
    private readonly outboxPublisher: IntegrationOutboxPublisher,
  ) {}

  async createPickerSession(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<GoogleDrivePickerSessionDto> {
    await this.assertCurrentUserCanManage(workspaceId, userId);
    const pickerConfig = this.configProvider.getConfig().googleDrivePicker;
    if (pickerConfig === null) {
      throw new ServiceUnavailableException("Google Drive Picker is not configured.");
    }
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    return new GoogleDrivePickerSessionDto({
      accessToken: grant.accessToken,
      appId: pickerConfig.appId,
      developerKey: pickerConfig.developerKey,
      expiresAt: new Date(Date.now() + grant.expiresInSeconds * 1_000),
    });
  }

  async selectRootFolder(
    workspaceId: string,
    integrationId: string,
    folderId: string,
    userId: string,
  ): Promise<GoogleDriveRootFolderDto> {
    await this.assertCurrentUserCanManage(workspaceId, userId);
    const grant = await this.getAccessGrant(workspaceId, integrationId);
    let folder: GoogleDriveFolder;
    try {
      folder = await this.driveClient.getWritableFolder(grant.accessToken, folderId);
    } catch (error: unknown) {
      if (error instanceof GoogleDriveFolderSelectionError) {
        throw new BadRequestException("Select a writable Google Drive folder.");
      }
      if (error instanceof GoogleDriveApiError) {
        throw new BadGatewayException("Google Drive is unavailable.");
      }
      throw error;
    }
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      await assertWorkspaceManager(manager, workspaceId, userId);
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository
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
      const currentConnection = await manager.getRepository(IntegrationConnectionEntity).findOneBy({
        id: grant.connectionId,
        status: "connected",
        workspaceIntegrationId: integration.id,
      });
      if (currentConnection === null) {
        throw new ConflictException("Google Drive connection changed. Try again.");
      }

      const now = new Date();
      const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
      const existingResource = await resourceRepository.findOneBy({
        connectionId: currentConnection.id,
        providerResourceId: folder.id,
      });
      const resource = existingResource ?? resourceRepository.create();
      resource.connectionId = currentConnection.id;
      resource.lastSyncedAt = now;
      resource.metadata = {};
      resource.mimeType = googleDriveFolderMimeType;
      resource.modifiedAt = folder.modifiedAt === null ? null : new Date(folder.modifiedAt);
      resource.name = folder.name;
      resource.parentProviderResourceId = folder.parentId;
      resource.providerResourceId = folder.id;
      resource.resourceKind = "google-drive.folder";
      resource.status = "active";
      resource.version = folder.version;
      resource.webUrl = folder.webViewLink;
      await resourceRepository.save(resource);

      const linkRepository = manager.getRepository(IntegrationResourceLinkEntity);
      await linkRepository
        .createQueryBuilder()
        .delete()
        .where(`"target_type" = :targetType`, { targetType: "workspace" })
        .andWhere(`"target_id" = :targetId`, { targetId: workspaceId })
        .andWhere(`"relation" = :relation`, { relation: "managed_root" })
        .andWhere(
          `"external_resource_id" IN (SELECT "id" FROM "integration_external_resources" WHERE "connection_id" = :connectionId)`,
          { connectionId: currentConnection.id },
        )
        .execute();
      const link = linkRepository.create({
        createdByUserId: userId,
        externalResourceId: resource.id,
        metadata: {},
        relation: "managed_root",
        targetId: workspaceId,
        targetType: "workspace",
      });
      await linkRepository.save(link);

      integration.config = {
        ...integration.config,
        rootFolder: {
          externalResourceId: resource.id,
          name: resource.name,
          providerResourceId: resource.providerResourceId,
          webUrl: resource.webUrl,
        },
      };
      await integrationRepository.save(integration);
      await this.outboxPublisher.publishUsingManager(manager, {
        actorUserId: userId,
        entity: { id: integration.id, type: "workspace_integration" },
        id: randomUUID(),
        name: "integration.connected.v1",
        occurredAt: now.toISOString(),
        payload: { configuration: "rootFolder", pluginKey: googleDrivePluginKey },
        workspaceId,
      });
      return new GoogleDriveRootFolderDto({
        externalResourceId: resource.id,
        name: resource.name,
        providerResourceId: resource.providerResourceId,
        webUrl: resource.webUrl,
      });
    });
  }

  private async assertCurrentUserCanManage(workspaceId: string, userId: string): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await assertWorkspaceManager(dataSource.manager, workspaceId, userId);
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
