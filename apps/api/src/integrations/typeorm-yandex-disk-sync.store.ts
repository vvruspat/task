import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { type DataSource, type EntityManager, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  TaskEntity,
} from "../persistence/entities/index.js";
import type { YandexDiskResource } from "./yandex-disk.client.js";
import type {
  SynchronizeYandexDiskFolderInput,
  YandexDiskSyncStore,
} from "./yandex-disk-sync.contracts.js";

const yandexDiskFileResourceKind = "yandex-disk.file";

type YandexDiskActivityKind = "added" | "changed" | "removed";

@Injectable()
export class TypeOrmYandexDiskSyncStore implements YandexDiskSyncStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async synchronizeFolder(input: SynchronizeYandexDiskFolderInput): Promise<number> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const taskExists = await manager.getRepository(TaskEntity).existsBy({
        id: input.taskId,
        workspaceId: input.workspaceId,
      });
      if (!taskExists) return 0;
      const repository = manager.getRepository(IntegrationExternalResourceEntity);
      const existing = await repository.findBy({
        connectionId: input.connectionId,
        parentProviderResourceId: input.folderPath,
        resourceKind: yandexDiskFileResourceKind,
      });
      const resourceByPath = new Map(
        existing.map((resource) => [resource.providerResourceId, resource]),
      );
      const existingLinks =
        existing.length === 0
          ? []
          : await manager.getRepository(IntegrationResourceLinkEntity).findBy({
              externalResourceId: In(existing.map((resource) => resource.id)),
            });
      const exportedResourceIds = new Set(
        existingLinks
          .filter((link) => link.relation === "export")
          .map((link) => link.externalResourceId),
      );
      const discoveredResourceIds = new Set(
        existingLinks
          .filter(
            (link) =>
              link.relation === "reference" &&
              link.targetType === "task" &&
              link.targetId === input.taskId &&
              link.metadata["discoveredFrom"] === "managed_container",
          )
          .map((link) => link.externalResourceId),
      );
      const seenPaths = new Set<string>();
      let insertedEvents = 0;

      for (const file of input.files) {
        if (!isDiscoverableYandexDiskFile(file, input.folderPath)) continue;
        seenPaths.add(file.path);
        let resource = resourceByPath.get(file.path);
        const previousVersion = resource?.version ?? null;
        const previousStatus = resource?.status ?? null;
        if (resource === undefined) {
          resource = repository.create({
            connectionId: input.connectionId,
            lastSyncedAt: input.syncedAt,
            metadata: { discoveredFrom: "managed_container", sizeBytes: file.sizeBytes },
            mimeType: file.mimeType,
            modifiedAt: file.modifiedAt === null ? null : new Date(file.modifiedAt),
            name: file.name,
            parentProviderResourceId: file.parentId,
            providerResourceId: file.path,
            resourceKind: yandexDiskFileResourceKind,
            status: "active",
            version: file.version,
            webUrl: file.webUrl,
          });
          await repository.save(resource);
          resourceByPath.set(file.path, resource);
        } else {
          applyFile(resource, file, input.syncedAt);
          await repository.save(resource);
        }
        if (exportedResourceIds.has(resource.id)) continue;
        if (!discoveredResourceIds.has(resource.id)) {
          await createReferenceLink(manager, resource.id, input.taskId);
          discoveredResourceIds.add(resource.id);
          insertedEvents += await insertActivity(manager, input, resource, file, "added");
        } else if (
          previousStatus !== null &&
          (previousStatus !== "active" || previousVersion !== file.version)
        ) {
          insertedEvents += await insertActivity(manager, input, resource, file, "changed");
        }
      }

      for (const resource of existing) {
        if (
          seenPaths.has(resource.providerResourceId) ||
          resource.status !== "active" ||
          exportedResourceIds.has(resource.id) ||
          !discoveredResourceIds.has(resource.id)
        ) {
          continue;
        }
        resource.lastSyncedAt = input.syncedAt;
        resource.status = "deleted";
        await repository.save(resource);
        insertedEvents += await insertActivity(manager, input, resource, null, "removed");
      }
      return insertedEvents;
    });
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

function applyFile(
  resource: IntegrationExternalResourceEntity,
  file: YandexDiskResource,
  syncedAt: Date,
): void {
  resource.lastSyncedAt = syncedAt;
  resource.metadata = {
    ...resource.metadata,
    discoveredFrom: resource.metadata["discoveredFrom"] ?? "managed_container",
    sizeBytes: file.sizeBytes,
  };
  resource.mimeType = file.mimeType;
  resource.modifiedAt = file.modifiedAt === null ? null : new Date(file.modifiedAt);
  resource.name = file.name;
  resource.parentProviderResourceId = file.parentId;
  resource.providerResourceId = file.path;
  resource.status = "active";
  resource.version = file.version;
  resource.webUrl = file.webUrl;
}

async function createReferenceLink(
  manager: EntityManager,
  resourceId: string,
  taskId: string,
): Promise<void> {
  const repository = manager.getRepository(IntegrationResourceLinkEntity);
  await repository.save(
    repository.create({
      createdByUserId: null,
      externalResourceId: resourceId,
      metadata: { discoveredFrom: "managed_container" },
      relation: "reference",
      targetId: taskId,
      targetType: "task",
    }),
  );
}

async function insertActivity(
  manager: EntityManager,
  input: SynchronizeYandexDiskFolderInput,
  resource: IntegrationExternalResourceEntity,
  file: YandexDiskResource | null,
  kind: YandexDiskActivityKind,
): Promise<number> {
  const versionIdentity = file?.version ?? resource.version ?? "missing";
  const identity = [
    input.connectionId,
    resource.providerResourceId,
    versionIdentity,
    kind,
    input.taskId,
  ].join(":");
  const id = stableYandexDiskActivityEventId(identity);
  const changedAt =
    file?.modifiedAt === null || file?.modifiedAt === undefined
      ? input.syncedAt
      : new Date(file.modifiedAt);
  const inserted: unknown = await manager.query(
    `INSERT INTO "activity_events" ("id", "workspace_id", "actor_user_id", "event_type", "entity_type", "entity_id", "payload", "created_at") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT ("id") DO NOTHING RETURNING "id"`,
    [
      id,
      input.workspaceId,
      null,
      `integration.yandex_disk.resource_${kind}`,
      "task",
      input.taskId,
      JSON.stringify({
        changeTime: changedAt.toISOString(),
        integrationProvider: "yandex-disk",
        modifiedAt: file?.modifiedAt ?? resource.modifiedAt?.toISOString() ?? null,
        providerResourceId: resource.providerResourceId,
        removed: kind === "removed",
        resourceId: resource.id,
        resourceName: file?.name ?? resource.name,
        taskId: input.taskId,
        version: file?.version ?? resource.version,
        webUrl: file?.webUrl ?? resource.webUrl,
      }),
      changedAt,
    ],
  );
  return Array.isArray(inserted) && inserted.length > 0 ? 1 : 0;
}

export function isDiscoverableYandexDiskFile(
  resource: YandexDiskResource,
  folderPath: string,
): boolean {
  return resource.resourceType === "file" && resource.parentId === folderPath;
}

export function stableYandexDiskActivityEventId(identity: string): string {
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
