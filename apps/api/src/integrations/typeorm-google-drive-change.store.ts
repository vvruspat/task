import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { type DataSource, type EntityManager, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  AttachmentEntity,
  CommentEntity,
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  IntegrationResourceReferenceEntity,
  TaskEntity,
} from "../persistence/entities/index.js";
import { googleDriveFolderMimeType } from "./google-drive.client.js";
import type {
  GoogleDriveChangeStore,
  RecordGoogleDriveChangesInput,
} from "./google-drive-change.store.js";
import type { GoogleDriveChange, GoogleDriveChangedFile } from "./google-drive-changes.client.js";

const googleDriveFileResourceKind = "google-drive.file";
const googleDriveFolderResourceKind = "google-drive.folder";

type DriveActivityKind = "added" | "changed" | "removed";

@Injectable()
export class TypeOrmGoogleDriveChangeStore implements GoogleDriveChangeStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async recordChanges(input: RecordGoogleDriveChangesInput): Promise<number> {
    if (input.changes.length === 0) return 0;
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
      const providerResourceIds = [...new Set(input.changes.map((change) => change.fileId))];
      const parentProviderResourceIds = [
        ...new Set(
          input.changes.flatMap((change) =>
            change.file?.parentId === null || change.file?.parentId === undefined
              ? []
              : [change.file.parentId],
          ),
        ),
      ];
      const resources = await resourceRepository.findBy({
        connectionId: input.connectionId,
        providerResourceId: In(providerResourceIds),
      });
      const resourceByProviderId = new Map(
        resources.map((resource) => [resource.providerResourceId, resource]),
      );
      const taskIdByFolderProviderId = await findManagedTaskFolders(
        manager,
        input.connectionId,
        parentProviderResourceIds,
      );
      const initialResourceIds = resources.map((resource) => resource.id);
      const initialLinks =
        initialResourceIds.length === 0
          ? []
          : await manager.getRepository(IntegrationResourceLinkEntity).findBy({
              externalResourceId: In(initialResourceIds),
            });
      const exportedResourceIds = new Set(
        initialLinks
          .filter((link) => link.relation === "export")
          .map((link) => link.externalResourceId),
      );
      const discoveredLinksByResourceId = groupDiscoveredTaskLinks(initialLinks);
      const explicitKinds = new Map<GoogleDriveChange, Map<string, DriveActivityKind>>();

      for (const change of input.changes) {
        let resource = resourceByProviderId.get(change.fileId);
        const wasDiscoveredNow = resource === undefined;
        const targetTaskId = googleDriveManagedTaskForFile(change.file, taskIdByFolderProviderId);
        if (resource === undefined) {
          if (!canDiscoverGoogleDriveFile(change, targetTaskId)) continue;
          resource = createDiscoveredResource(
            resourceRepository.create(),
            input.connectionId,
            change.file,
            input.syncedAt,
          );
          await resourceRepository.save(resource);
          resources.push(resource);
          resourceByProviderId.set(resource.providerResourceId, resource);
        }

        applyChangeToResource(resource, change, input.syncedAt);
        if (
          resource.resourceKind !== googleDriveFileResourceKind ||
          exportedResourceIds.has(resource.id)
        ) {
          continue;
        }

        const currentLinks = discoveredLinksByResourceId.get(resource.id) ?? [];
        const currentTaskIds = new Set(currentLinks.map((link) => link.targetId));
        const removed = change.removed || change.file?.trashed === true;
        if (removed) {
          for (const taskId of currentTaskIds) {
            setExplicitKind(explicitKinds, change, taskId, "removed");
          }
          continue;
        }

        if (targetTaskId === null) {
          for (const link of currentLinks) {
            await manager.getRepository(IntegrationResourceLinkEntity).remove(link);
            setExplicitKind(explicitKinds, change, link.targetId, "removed");
          }
          discoveredLinksByResourceId.set(resource.id, []);
          continue;
        }

        const retainedLinks: IntegrationResourceLinkEntity[] = [];
        for (const link of currentLinks) {
          if (link.targetId === targetTaskId) {
            retainedLinks.push(link);
            continue;
          }
          await manager.getRepository(IntegrationResourceLinkEntity).remove(link);
          setExplicitKind(explicitKinds, change, link.targetId, "removed");
        }
        if (!currentTaskIds.has(targetTaskId)) {
          const linkRepository = manager.getRepository(IntegrationResourceLinkEntity);
          const link = await linkRepository.save(
            linkRepository.create({
              createdByUserId: null,
              externalResourceId: resource.id,
              metadata: { discoveredFrom: "managed_container" },
              relation: "reference",
              targetId: targetTaskId,
              targetType: "task",
            }),
          );
          retainedLinks.push(link);
          setExplicitKind(explicitKinds, change, targetTaskId, "added");
        } else if (wasDiscoveredNow) {
          setExplicitKind(explicitKinds, change, targetTaskId, "added");
        }
        discoveredLinksByResourceId.set(resource.id, retainedLinks);
      }

      if (resources.length === 0) return 0;
      await resourceRepository.save(resources);
      const activityResources = resources.filter(
        (resource) => resource.resourceKind === googleDriveFileResourceKind,
      );
      if (activityResources.length === 0) return 0;
      const taskIdsByResourceId = await resolveTaskIdsForResources(
        manager,
        activityResources.map((resource) => resource.id),
        input.workspaceId,
      );
      const explicitTaskIds = [...explicitKinds.values()].flatMap((kinds) => [...kinds.keys()]);
      const candidateTaskIds = new Set([
        ...[...taskIdsByResourceId.values()].flatMap((taskIds) => [...taskIds]),
        ...explicitTaskIds,
      ]);
      if (candidateTaskIds.size === 0) return 0;
      const tasks = await manager.getRepository(TaskEntity).findBy({
        id: In([...candidateTaskIds]),
        workspaceId: input.workspaceId,
      });
      const validTaskIds = new Set(tasks.map((task) => task.id));
      let insertedEvents = 0;

      for (const change of input.changes) {
        const resource = resourceByProviderId.get(change.fileId);
        if (resource === undefined || resource.resourceKind !== googleDriveFileResourceKind)
          continue;
        const taskKinds = new Map<string, DriveActivityKind>();
        const defaultKind: DriveActivityKind =
          change.removed || change.file?.trashed === true ? "removed" : "changed";
        for (const taskId of taskIdsByResourceId.get(resource.id) ?? []) {
          taskKinds.set(taskId, defaultKind);
        }
        for (const [taskId, kind] of explicitKinds.get(change) ?? []) {
          taskKinds.set(taskId, kind);
        }
        for (const [taskId, kind] of taskKinds) {
          if (!validTaskIds.has(taskId)) continue;
          const event = createDriveActivityEvent(input, change, resource, taskId, kind);
          const inserted = await manager.query(
            `INSERT INTO "activity_events" ("id", "workspace_id", "actor_user_id", "event_type", "entity_type", "entity_id", "payload", "created_at") VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT ("id") DO NOTHING RETURNING "id"`,
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
          if (Array.isArray(inserted) && inserted.length > 0) insertedEvents += 1;
        }
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

async function findManagedTaskFolders(
  manager: EntityManager,
  connectionId: string,
  providerResourceIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (providerResourceIds.length === 0) return new Map();
  const folders = await manager.getRepository(IntegrationExternalResourceEntity).findBy({
    connectionId,
    providerResourceId: In([...providerResourceIds]),
    resourceKind: googleDriveFolderResourceKind,
    status: "active",
  });
  if (folders.length === 0) return new Map();
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    externalResourceId: In(folders.map((folder) => folder.id)),
    relation: "managed_container",
    targetType: "task",
  });
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const result = new Map<string, string>();
  for (const link of links) {
    const folder = folderById.get(link.externalResourceId);
    if (folder === undefined) continue;
    const existingTaskId = result.get(folder.providerResourceId);
    if (existingTaskId !== undefined && existingTaskId !== link.targetId) {
      throw new Error(
        `Google Drive folder ${folder.providerResourceId} is assigned to multiple tasks.`,
      );
    }
    result.set(folder.providerResourceId, link.targetId);
  }
  return result;
}

export function googleDriveManagedTaskForFile(
  file: GoogleDriveChangedFile | null,
  taskIdByFolderProviderId: ReadonlyMap<string, string>,
): string | null {
  if (file === null || file.trashed || file.parentId === null) return null;
  return taskIdByFolderProviderId.get(file.parentId) ?? null;
}

export function canDiscoverGoogleDriveFile(
  change: GoogleDriveChange,
  targetTaskId: string | null,
): boolean {
  return (
    targetTaskId !== null &&
    !change.removed &&
    change.file !== null &&
    !change.file.trashed &&
    change.file.mimeType !== null &&
    change.file.mimeType !== googleDriveFolderMimeType &&
    change.file.name !== null
  );
}

function createDiscoveredResource(
  resource: IntegrationExternalResourceEntity,
  connectionId: string,
  file: GoogleDriveChangedFile | null,
  syncedAt: Date,
): IntegrationExternalResourceEntity {
  if (file === null || file.name === null || file.mimeType === null) {
    throw new Error("Cannot register a Google Drive file without complete metadata.");
  }
  resource.connectionId = connectionId;
  resource.lastSyncedAt = syncedAt;
  resource.metadata = { discoveredFrom: "managed_container" };
  resource.mimeType = file.mimeType;
  resource.modifiedAt = file.modifiedAt === null ? null : new Date(file.modifiedAt);
  resource.name = file.name;
  resource.parentProviderResourceId = file.parentId;
  resource.providerResourceId = file.id;
  resource.resourceKind = googleDriveFileResourceKind;
  resource.status = "active";
  resource.version = file.version;
  resource.webUrl = file.webViewLink;
  return resource;
}

function groupDiscoveredTaskLinks(
  links: readonly IntegrationResourceLinkEntity[],
): Map<string, IntegrationResourceLinkEntity[]> {
  const grouped = new Map<string, IntegrationResourceLinkEntity[]>();
  for (const link of links) {
    if (
      link.relation !== "reference" ||
      link.targetType !== "task" ||
      link.metadata["discoveredFrom"] !== "managed_container"
    ) {
      continue;
    }
    const group = grouped.get(link.externalResourceId) ?? [];
    group.push(link);
    grouped.set(link.externalResourceId, group);
  }
  return grouped;
}

function setExplicitKind(
  explicitKinds: Map<GoogleDriveChange, Map<string, DriveActivityKind>>,
  change: GoogleDriveChange,
  taskId: string,
  kind: DriveActivityKind,
): void {
  const kinds = explicitKinds.get(change) ?? new Map<string, DriveActivityKind>();
  kinds.set(taskId, kind);
  explicitKinds.set(change, kinds);
}

async function resolveTaskIdsForResources(
  manager: EntityManager,
  resourceIds: readonly string[],
  workspaceId: string,
): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    externalResourceId: In([...resourceIds]),
  });
  const references = await manager.getRepository(IntegrationResourceReferenceEntity).findBy({
    externalResourceId: In([...resourceIds]),
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
          workspaceId,
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
          workspaceId,
        });
  const commentById = new Map(comments.map((comment) => [comment.id, comment]));
  const result = new Map<string, Set<string>>();
  for (const link of links) {
    const taskId = taskIdForLink(link, attachmentById, commentById);
    if (taskId === null) continue;
    const taskIds = result.get(link.externalResourceId) ?? new Set<string>();
    taskIds.add(taskId);
    result.set(link.externalResourceId, taskIds);
  }
  for (const reference of references) {
    if (reference.externalResourceId === null) continue;
    const taskId = taskIdForReference(reference, commentById);
    if (taskId === null) continue;
    const taskIds = result.get(reference.externalResourceId) ?? new Set<string>();
    taskIds.add(taskId);
    result.set(reference.externalResourceId, taskIds);
  }
  return result;
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
  kind: DriveActivityKind,
): {
  actorUserId: null;
  createdAt: Date;
  entityId: string;
  entityType: "task";
  eventType: string;
  id: string;
  payload: Record<string, unknown>;
  workspaceId: string;
} {
  const identity = [
    input.connectionId,
    change.fileId,
    change.time,
    change.file?.version ?? "",
    kind,
    taskId,
  ].join(":");
  return {
    actorUserId: null,
    createdAt: new Date(change.time),
    entityId: taskId,
    entityType: "task",
    eventType: `integration.google_drive.resource_${kind}`,
    id: stableGoogleDriveActivityEventId(identity),
    payload: {
      changeTime: change.time,
      integrationProvider: "google-drive",
      modifiedAt: change.file?.modifiedAt ?? null,
      providerResourceId: change.fileId,
      removed: kind === "removed",
      resourceId: resource.id,
      resourceName: change.file?.name ?? resource.name,
      taskId,
      version: change.file?.version ?? resource.version,
      webUrl: change.file?.webViewLink ?? resource.webUrl,
    },
    workspaceId: input.workspaceId,
  };
}
