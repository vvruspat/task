import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  WorkspaceIntegrationEntity,
} from "../persistence/entities/index.js";
import { TypeOrmYandexDiskSyncStore } from "./typeorm-yandex-disk-sync.store.js";
import { YandexDiskClient, type YandexDiskResource } from "./yandex-disk.client.js";
import { YandexDiskAccessService } from "./yandex-disk-access.service.js";
import type { YandexDiskSyncStore } from "./yandex-disk-sync.contracts.js";

type ManagedTaskFolder = {
  connectionId: string;
  installationId: string;
  path: string;
  taskId: string;
  workspaceId: string;
};

@Injectable()
export class YandexDiskSyncService {
  private initialization: Promise<DataSource> | null = null;
  private readonly logger = new Logger(YandexDiskSyncService.name);

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    @Inject(YandexDiskAccessService)
    private readonly accessService: YandexDiskAccessService,
    @Inject(YandexDiskClient)
    private readonly diskClient: YandexDiskClient,
    @Inject(TypeOrmYandexDiskSyncStore) private readonly store: YandexDiskSyncStore,
  ) {}

  isConfigured(): boolean {
    return this.dataSourceProvider.getDataSource() !== null;
  }

  async syncTaskFolder(input: {
    accessToken: string;
    connectionId: string;
    folderPath: string;
    taskId: string;
    workspaceId: string;
  }): Promise<number> {
    const files = await this.listFiles(input.accessToken, input.folderPath);
    return await this.store.synchronizeFolder({
      connectionId: input.connectionId,
      files,
      folderPath: input.folderPath,
      syncedAt: new Date(),
      taskId: input.taskId,
      workspaceId: input.workspaceId,
    });
  }

  async syncAll(): Promise<{ eventsRecorded: number; failed: number; foldersScanned: number }> {
    const folders = await this.listManagedTaskFolders();
    const accessTokens = new Map<string, string>();
    let eventsRecorded = 0;
    let failed = 0;
    let foldersScanned = 0;
    for (const folder of folders) {
      try {
        let accessToken = accessTokens.get(folder.installationId);
        if (accessToken === undefined) {
          const grant = await this.accessService.getAccessGrant(
            folder.workspaceId,
            folder.installationId,
          );
          if (grant.connectionId !== folder.connectionId) {
            throw new Error("Yandex Disk managed folder no longer matches its connection.");
          }
          accessToken = grant.accessToken;
          accessTokens.set(folder.installationId, accessToken);
        }
        eventsRecorded += await this.syncTaskFolder({
          accessToken,
          connectionId: folder.connectionId,
          folderPath: folder.path,
          taskId: folder.taskId,
          workspaceId: folder.workspaceId,
        });
        foldersScanned += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `Could not synchronize Yandex Disk folder ${folder.path} for task ${folder.taskId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
    return { eventsRecorded, failed, foldersScanned };
  }

  private async listFiles(accessToken: string, folderPath: string): Promise<YandexDiskResource[]> {
    const files: YandexDiskResource[] = [];
    let offset = 0;
    while (true) {
      const page = await this.diskClient.listFolder(accessToken, folderPath, offset);
      files.push(...page.items.filter((item) => item.resourceType === "file"));
      if (page.nextOffset === null) return files;
      offset = page.nextOffset;
    }
  }

  private async listManagedTaskFolders(): Promise<ManagedTaskFolder[]> {
    const dataSource = await this.getInitializedDataSource();
    const integrations = await dataSource.getRepository(WorkspaceIntegrationEntity).find({
      where: { pluginKey: "yandex-disk", status: "connected" },
    });
    const folders: ManagedTaskFolder[] = [];
    for (const integration of integrations) {
      const connection = await dataSource.getRepository(IntegrationConnectionEntity).findOneBy({
        status: "connected",
        workspaceIntegrationId: integration.id,
      });
      if (connection === null) continue;
      const resources = await dataSource.getRepository(IntegrationExternalResourceEntity).find({
        where: {
          connectionId: connection.id,
          resourceKind: "yandex-disk.folder",
          status: "active",
        },
      });
      for (const resource of resources) {
        const link = await dataSource.getRepository(IntegrationResourceLinkEntity).findOneBy({
          externalResourceId: resource.id,
          relation: "managed_container",
          targetType: "task",
        });
        if (link === null) continue;
        folders.push({
          connectionId: connection.id,
          installationId: integration.id,
          path: resource.providerResourceId,
          taskId: link.targetId,
          workspaceId: integration.workspaceId,
        });
      }
    }
    return folders;
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
