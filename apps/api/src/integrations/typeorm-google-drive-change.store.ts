import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { type DataSource, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  AttachmentEntity,
  CommentEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  IntegrationResourceReferenceEntity,
  TaskEntity,
} from "../persistence/entities/index.js";
import type {
  GoogleDriveChangeStore,
  RecordGoogleDriveChangesInput,
} from "./google-drive-change.store.js";
import type { GoogleDriveChange } from "./google-drive-changes.client.js";

@Injectable()
export class TypeOrmGoogleDriveChangeStore implements GoogleDriveChangeStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async recordChanges(input: RecordGoogleDriveChangesInput): Promise<number> {
    if (input.changes.length === 0) return 0;
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const providerResourceIds = [...new Set(input.changes.map((change) => change.fileId))];
      const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
      const resources = await resourceRepository.findBy({
        connectionId: input.connectionId,
        providerResourceId: In(providerResourceIds),
      });
      if (resources.length === 0) return 0;
      const resourceByProviderId = new Map(
        resources.map((resource) => [resource.providerResourceId, resource]),
      );
      for (const change of input.changes) {
        const resource = resourceByProviderId.get(change.fileId);
        if (resource === undefined) continue;
        applyChangeToResource(resource, change, input.syncedAt);
      }
      await resourceRepository.save(resources);

      const resourceIds = resources.map((resource) => resource.id);
      const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
        externalResourceId: In(resourceIds),
      });
      const references = await manager.getRepository(IntegrationResourceReferenceEntity).findBy({
        externalResourceId: In(resourceIds),
        status: "active",
      });
      const attachmentIds = links.flatMap((link) =>
        link.targetType === "attachment" ? [link.targetId] : [],
      );
      const attachments =
        attachmentIds.length === 0
          ? []
          : await manager.getRepository(AttachmentEntity).findBy({
              id: In(attachmentIds),
              workspaceId: input.workspaceId,
            });
      const attachmentById = new Map(attachments.map((attachment) => [attachment.id, attachment]));
      const commentIds = [
        ...links.flatMap((link) => (link.targetType === "comment" ? [link.targetId] : [])),
        ...references.flatMap((reference) =>
          reference.sourceType === "comment" ? [reference.sourceId] : [],
        ),
        ...attachments.flatMap((attachment) =>
          attachment.targetType === "comment" ? [attachment.targetId] : [],
        ),
      ];
      const comments =
        commentIds.length === 0
          ? []
          : await manager.getRepository(CommentEntity).findBy({
              id: In(commentIds),
              workspaceId: input.workspaceId,
            });
      const commentById = new Map(comments.map((comment) => [comment.id, comment]));
      const linksByResourceId = groupLinksByResourceId(links);
      const referencesByResourceId = groupReferencesByResourceId(references);
      const candidateTaskIds = new Set<string>();
      for (const link of links) {
        const taskId = taskIdForLink(link, attachmentById, commentById);
        if (taskId !== null) candidateTaskIds.add(taskId);
      }
      for (const reference of references) {
        const taskId = taskIdForReference(reference, commentById);
        if (taskId !== null) candidateTaskIds.add(taskId);
      }
      if (candidateTaskIds.size === 0) return 0;
      const tasks = await manager.getRepository(TaskEntity).findBy({
        id: In([...candidateTaskIds]),
        workspaceId: input.workspaceId,
      });
      const validTaskIds = new Set(tasks.map((task) => task.id));
      const events: ActivityEventEntity[] = [];
      for (const change of input.changes) {
        const resource = resourceByProviderId.get(change.fileId);
        if (resource === undefined) continue;
        const taskIds = new Set<string>();
        for (const link of linksByResourceId.get(resource.id) ?? []) {
          const taskId = taskIdForLink(link, attachmentById, commentById);
          if (taskId !== null && validTaskIds.has(taskId)) taskIds.add(taskId);
        }
        for (const reference of referencesByResourceId.get(resource.id) ?? []) {
          const taskId = taskIdForReference(reference, commentById);
          if (taskId !== null && validTaskIds.has(taskId)) taskIds.add(taskId);
        }
        for (const taskId of taskIds) {
          events.push(createDriveActivityEvent(input, change, resource, taskId));
        }
      }
      if (events.length === 0) return 0;
      for (const event of events) {
        await manager.query(
          `INSERT INTO "activity_events" ("id", "workspace_id", "actor_user_id", "event_type", "entity_type", "entity_id", "payload", "created_at") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT ("id") DO NOTHING`,
          [
            event.id,
            event.workspaceId,
            event.actorUserId,
            event.eventType,
            event.entityType,
            event.entityId,
            JSON.stringify(event.payload),
            event.createdAt,
          ],
        );
      }
      return events.length;
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

function groupReferencesByResourceId(
  references: readonly IntegrationResourceReferenceEntity[],
): ReadonlyMap<string, readonly IntegrationResourceReferenceEntity[]> {
  const grouped = new Map<string, IntegrationResourceReferenceEntity[]>();
  for (const reference of references) {
    if (reference.externalResourceId === null) continue;
    const group = grouped.get(reference.externalResourceId) ?? [];
    group.push(reference);
    grouped.set(reference.externalResourceId, group);
  }
  return grouped;
}

export function stableGoogleDriveActivityEventId(identity: string): string {
  const hash = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function applyChangeToResource(
  resource: IntegrationExternalResourceEntity,
  change: GoogleDriveChange,
  syncedAt: Date,
): void {
  const file = change.file;
  resource.lastSyncedAt = syncedAt;
  resource.metadata = { ...resource.metadata, providerChangeTime: change.time };
  if (file === null) {
    resource.status = change.removed ? "deleted" : "unavailable";
    return;
  }
  if (file.name !== null) resource.name = file.name;
  if (file.mimeType !== null) resource.mimeType = file.mimeType;
  resource.modifiedAt = file.modifiedAt === null ? null : new Date(file.modifiedAt);
  resource.parentProviderResourceId = file.parentId;
  resource.status = change.removed || file.trashed ? "deleted" : "active";
  resource.version = file.version;
  resource.webUrl = file.webViewLink;
}

function groupLinksByResourceId(
  links: readonly IntegrationResourceLinkEntity[],
): ReadonlyMap<string, readonly IntegrationResourceLinkEntity[]> {
  const grouped = new Map<string, IntegrationResourceLinkEntity[]>();
  for (const link of links) {
    const group = grouped.get(link.externalResourceId) ?? [];
    group.push(link);
    grouped.set(link.externalResourceId, group);
  }
  return grouped;
}

function taskIdForLink(
  link: IntegrationResourceLinkEntity,
  attachmentById: ReadonlyMap<string, AttachmentEntity>,
  commentById: ReadonlyMap<string, CommentEntity>,
): string | null {
  if (link.targetType === "task") return link.targetId;
  if (link.targetType === "comment") return commentById.get(link.targetId)?.taskId ?? null;
  if (link.targetType !== "attachment") return null;
  const attachment = attachmentById.get(link.targetId);
  if (attachment === undefined) return null;
  if (attachment.targetType === "task") return attachment.targetId;
  if (attachment.targetType === "comment") {
    return commentById.get(attachment.targetId)?.taskId ?? null;
  }
  return null;
}

function taskIdForReference(
  reference: IntegrationResourceReferenceEntity,
  commentById: ReadonlyMap<string, CommentEntity>,
): string | null {
  return reference.sourceType === "task_description"
    ? reference.sourceId
    : (commentById.get(reference.sourceId)?.taskId ?? null);
}

function createDriveActivityEvent(
  input: RecordGoogleDriveChangesInput,
  change: GoogleDriveChange,
  resource: IntegrationExternalResourceEntity,
  taskId: string,
): ActivityEventEntity {
  const removed = change.removed || change.file?.trashed === true;
  const identity = [
    input.connectionId,
    change.fileId,
    change.time,
    change.file?.version ?? "",
    removed ? "removed" : "changed",
    taskId,
  ].join(":");
  const event = new ActivityEventEntity();
  event.actorUserId = null;
  event.createdAt = new Date(change.time);
  event.entityId = taskId;
  event.entityType = "task";
  event.eventType = removed
    ? "integration.google_drive.resource_removed"
    : "integration.google_drive.resource_changed";
  event.id = stableGoogleDriveActivityEventId(identity);
  event.payload = {
    changeTime: change.time,
    integrationProvider: "google-drive",
    modifiedAt: change.file?.modifiedAt ?? null,
    providerResourceId: change.fileId,
    removed,
    resourceId: resource.id,
    resourceName: change.file?.name ?? resource.name,
    taskId,
    version: change.file?.version ?? resource.version,
    webUrl: change.file?.webViewLink ?? resource.webUrl,
  };
  event.workspaceId = input.workspaceId;
  return event;
}
