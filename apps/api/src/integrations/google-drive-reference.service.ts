import { Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import { type DataSource, type EntityManager, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  CommentEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceReferenceEntity,
  TaskEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the access service value at runtime.
import { GoogleDriveAccessService } from "./google-drive-access.service.js";
import { extractGoogleDriveReferences } from "./google-drive-url.js";
import type { IntegrationResourceReferenceSourceType } from "./integration-resources.contracts.js";

const googleDrivePluginKey = "google-drive";

type ReferenceSource = {
  id: string;
  sourceType: IntegrationResourceReferenceSourceType;
};

@Injectable()
export class GoogleDriveReferenceService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly accessService: GoogleDriveAccessService,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (handlerContext.pluginKey !== googleDrivePluginKey) {
      throw new Error(`Unexpected integration plugin ${handlerContext.pluginKey}.`);
    }
    const source = referenceSourceForEvent(event);
    if (source === null) return;
    const connection = await this.accessService.getConnectedConnection(
      event.workspaceId,
      handlerContext.installationId,
    );
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const text = await readSourceText(manager, event.workspaceId, source);
      if (text === null) return;
      await reconcileReferences(manager, connection.connectionId, source, text, event.occurredAt);
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

export function referenceSourceForEvent(event: IntegrationDomainEvent): ReferenceSource | null {
  if (
    (event.name === "task.created.v1" || event.name === "task.updated.v1") &&
    event.entity.type === "task"
  ) {
    return { id: event.entity.id, sourceType: "task_description" };
  }
  if (event.name === "comment.created.v1" && event.entity.type === "comment") {
    return { id: event.entity.id, sourceType: "comment" };
  }
  return null;
}

async function readSourceText(
  manager: EntityManager,
  workspaceId: string,
  source: ReferenceSource,
): Promise<string | null> {
  if (source.sourceType === "task_description") {
    const task = await manager
      .getRepository(TaskEntity)
      .createQueryBuilder("task")
      .where("task.id = :sourceId", { sourceId: source.id })
      .andWhere("task.workspaceId = :workspaceId", { workspaceId })
      .setLock("pessimistic_write")
      .getOne();
    return task === null ? null : (task.description ?? "");
  }
  const comment = await manager
    .getRepository(CommentEntity)
    .createQueryBuilder("comment")
    .where("comment.id = :sourceId", { sourceId: source.id })
    .andWhere("comment.workspaceId = :workspaceId", { workspaceId })
    .setLock("pessimistic_write")
    .getOne();
  return comment?.body ?? null;
}

async function reconcileReferences(
  manager: EntityManager,
  connectionId: string,
  source: ReferenceSource,
  text: string,
  occurredAt: string,
): Promise<void> {
  const seenAt = parseOccurredAt(occurredAt);
  const discovered = extractGoogleDriveReferences(text);
  const referenceRepository = manager.getRepository(IntegrationResourceReferenceEntity);
  const existing = await referenceRepository.findBy({
    connectionId,
    sourceId: source.id,
    sourceType: source.sourceType,
  });
  const resources =
    discovered.length === 0
      ? []
      : await manager.getRepository(IntegrationExternalResourceEntity).findBy({
          connectionId,
          providerResourceId: In(discovered.map((reference) => reference.providerResourceId)),
        });
  const resourcesByProviderId = new Map(
    resources.map((resource) => [resource.providerResourceId, resource]),
  );
  const discoveredByHash = new Map(discovered.map((reference) => [reference.urlHash, reference]));
  const existingByHash = new Map(existing.map((reference) => [reference.urlHash, reference]));
  const changed: IntegrationResourceReferenceEntity[] = [];

  for (const reference of discovered) {
    const resource = resourcesByProviderId.get(reference.providerResourceId);
    const entity = existingByHash.get(reference.urlHash) ?? referenceRepository.create();
    entity.connectionId = connectionId;
    entity.externalResourceId = resource?.id ?? null;
    entity.firstSeenAt = existingByHash.has(reference.urlHash) ? entity.firstSeenAt : seenAt;
    entity.lastSeenAt = seenAt;
    entity.metadata = {};
    entity.providerResourceId = reference.providerResourceId;
    entity.removedAt = null;
    entity.sourceId = source.id;
    entity.sourceType = source.sourceType;
    entity.status = resource === undefined ? "unresolved" : "active";
    entity.url = reference.url;
    entity.urlHash = reference.urlHash;
    changed.push(entity);
  }
  for (const reference of existing) {
    if (discoveredByHash.has(reference.urlHash) || reference.status === "removed") continue;
    reference.lastSeenAt = seenAt;
    reference.removedAt = seenAt;
    reference.status = "removed";
    changed.push(reference);
  }
  if (changed.length > 0) await referenceRepository.save(changed);
}

function parseOccurredAt(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Integration event has an invalid timestamp.");
  return date;
}
