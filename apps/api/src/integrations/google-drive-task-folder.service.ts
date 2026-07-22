import { Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import { type DataSource, type EntityManager, In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationExternalResourceEntity,
  IntegrationResourceLinkEntity,
  ProjectEntity,
  TaskEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the Drive client value at runtime.
import {
  GoogleDriveClient,
  type GoogleDriveFolder,
  googleDriveFolderMimeType,
} from "./google-drive.client.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the access service value at runtime.
import {
  type GoogleDriveAccessGrant,
  GoogleDriveAccessService,
} from "./google-drive-access.service.js";

const googleDrivePluginKey = "google-drive";
const maxFolderNameLength = 240;

type TaskFolderReservation = {
  folderId: string;
  name: string;
  parentId: string;
  resourceId: string;
  status: "active" | "reserved";
};

type TaskFolderContext = {
  access: GoogleDriveAccessGrant;
  actorUserId: string | null;
  installationId: string;
  workspaceId: string;
};

@Injectable()
export class GoogleDriveTaskFolderService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly accessService: GoogleDriveAccessService,
    private readonly driveClient: GoogleDriveClient,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (handlerContext.pluginKey !== googleDrivePluginKey) {
      throw new Error(`Unexpected integration plugin ${handlerContext.pluginKey}.`);
    }
    if (
      event.name === "integration.connected.v1" &&
      event.entity.type === "workspace_integration" &&
      event.entity.id === handlerContext.installationId &&
      event.payload["configuration"] === "rootFolder"
    ) {
      await this.backfillTaskFolders(event, handlerContext);
      return;
    }
    if (event.name !== "task.created.v1" || event.entity.type !== "task") return;
    const access = await this.accessService.getAccessGrant(
      event.workspaceId,
      handlerContext.installationId,
    );
    await this.ensureTaskFolder(event.entity.id, {
      access,
      actorUserId: event.actorUserId,
      installationId: handlerContext.installationId,
      workspaceId: event.workspaceId,
    });
  }

  private async backfillTaskFolders(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    const tasks = await dataSource.getRepository(TaskEntity).find({
      order: { createdAt: "ASC", id: "ASC" },
      select: { id: true },
      where: { archivedAt: IsNull(), workspaceId: event.workspaceId },
    });
    if (tasks.length === 0) return;
    const access = await this.accessService.getAccessGrant(
      event.workspaceId,
      handlerContext.installationId,
    );
    const context: TaskFolderContext = {
      access,
      actorUserId: event.actorUserId,
      installationId: handlerContext.installationId,
      workspaceId: event.workspaceId,
    };
    for (const task of tasks) await this.ensureTaskFolder(task.id, context);
  }

  private async ensureTaskFolder(
    taskId: string,
    context: TaskFolderContext,
    ancestors = new Set<string>(),
  ): Promise<string | null> {
    if (ancestors.has(taskId)) throw new Error(`Task hierarchy contains a cycle at ${taskId}.`);
    const nextAncestors = new Set(ancestors).add(taskId);
    const dataSource = await this.getInitializedDataSource();
    const task = await dataSource.getRepository(TaskEntity).findOneBy({
      id: taskId,
      workspaceId: context.workspaceId,
    });
    if (task === null || task.archivedAt !== null) return null;
    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: task.projectId,
      workspaceId: context.workspaceId,
    });
    if (project === null) throw new Error(`Project ${task.projectId} was not found.`);

    const parentId =
      task.parentTaskId === null
        ? await this.findManagedRootId(context.access.connectionId, context.workspaceId)
        : await this.ensureTaskFolder(task.parentTaskId, context, nextAncestors);
    if (parentId === null) return null;

    const name = buildGoogleDriveTaskFolderName(project.key, task.number, task.title);
    let reservation = await this.findTaskFolderReservation(context.access.connectionId, task.id);
    if (reservation === null) {
      const generatedFolderId = await this.driveClient.generateFileId(context.access.accessToken);
      reservation = await dataSource.transaction(async (manager) =>
        this.reserveTaskFolder(manager, {
          actorUserId: context.actorUserId,
          connectionId: context.access.connectionId,
          generatedFolderId,
          name,
          parentId,
          taskId: task.id,
        }),
      );
    }
    if (reservation.status === "active") return reservation.folderId;

    const folder = await this.driveClient.createFolder(context.access.accessToken, {
      appProperties: {
        tAskIntegrationId: context.installationId,
        tAskTaskId: task.id,
        tAskWorkspaceId: context.workspaceId,
      },
      folderId: reservation.folderId,
      name: reservation.name,
      parentId: reservation.parentId,
    });
    await this.markTaskFolderActive(
      reservation.resourceId,
      context.access.connectionId,
      folder,
      task.id,
    );
    return folder.id;
  }

  private async reserveTaskFolder(
    manager: EntityManager,
    input: {
      actorUserId: string | null;
      connectionId: string;
      generatedFolderId: string;
      name: string;
      parentId: string;
      taskId: string;
    },
  ): Promise<TaskFolderReservation> {
    const task = await manager
      .getRepository(TaskEntity)
      .createQueryBuilder("task")
      .where("task.id = :taskId", { taskId: input.taskId })
      .setLock("pessimistic_write")
      .getOne();
    if (task === null)
      throw new Error(`Task ${input.taskId} was not found while reserving a folder.`);
    const existing = await findLinkedTaskFolder(manager, input.connectionId, input.taskId);
    if (existing !== null) return toReservation(existing);

    const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
    const resource = resourceRepository.create({
      connectionId: input.connectionId,
      lastSyncedAt: new Date(),
      metadata: { provisioningState: "reserved", taskId: input.taskId },
      mimeType: googleDriveFolderMimeType,
      modifiedAt: null,
      name: input.name,
      parentProviderResourceId: input.parentId,
      providerResourceId: input.generatedFolderId,
      resourceKind: "google-drive.folder",
      status: "unavailable",
      version: null,
      webUrl: null,
    });
    await resourceRepository.save(resource);
    await manager.getRepository(IntegrationResourceLinkEntity).save(
      manager.getRepository(IntegrationResourceLinkEntity).create({
        createdByUserId: input.actorUserId,
        externalResourceId: resource.id,
        metadata: {},
        relation: "managed_container",
        targetId: input.taskId,
        targetType: "task",
      }),
    );
    return toReservation(resource);
  }

  private async findTaskFolderReservation(
    connectionId: string,
    taskId: string,
  ): Promise<TaskFolderReservation | null> {
    const dataSource = await this.getInitializedDataSource();
    const resource = await findLinkedTaskFolder(dataSource.manager, connectionId, taskId);
    return resource === null ? null : toReservation(resource);
  }

  private async findManagedRootId(
    connectionId: string,
    workspaceId: string,
  ): Promise<string | null> {
    const dataSource = await this.getInitializedDataSource();
    const links = await dataSource.getRepository(IntegrationResourceLinkEntity).findBy({
      relation: "managed_root",
      targetId: workspaceId,
      targetType: "workspace",
    });
    if (links.length === 0) return null;
    const resources = await dataSource.getRepository(IntegrationExternalResourceEntity).findBy({
      connectionId,
      id: In(links.map((link) => link.externalResourceId)),
      resourceKind: "google-drive.folder",
      status: "active",
    });
    if (resources.length > 1) throw new Error("Google Drive has multiple managed workspace roots.");
    return resources[0]?.providerResourceId ?? null;
  }

  private async markTaskFolderActive(
    resourceId: string,
    connectionId: string,
    folder: GoogleDriveFolder,
    taskId: string,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource.getRepository(IntegrationExternalResourceEntity).update(
      { connectionId, id: resourceId },
      {
        lastSyncedAt: new Date(),
        metadata: { provisioningState: "ready", taskId },
        mimeType: folder.mimeType,
        modifiedAt: folder.modifiedAt === null ? null : new Date(folder.modifiedAt),
        name: folder.name,
        parentProviderResourceId: folder.parentId,
        providerResourceId: folder.id,
        resourceKind: "google-drive.folder",
        status: "active",
        version: folder.version,
        webUrl: folder.webViewLink,
      },
    );
    if (result.affected !== 1)
      throw new Error(`Google Drive folder mapping ${resourceId} was lost.`);
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

export function buildGoogleDriveTaskFolderName(
  projectKey: string,
  taskNumber: number,
  title: string,
): string {
  const prefix = `${cleanFolderNamePart(projectKey).toUpperCase()}-${taskNumber}`;
  const cleanTitle = cleanFolderNamePart(title);
  const availableTitleLength = Math.max(0, maxFolderNameLength - prefix.length - 1);
  return cleanTitle.length === 0
    ? prefix.slice(0, maxFolderNameLength)
    : `${prefix} ${cleanTitle.slice(0, availableTitleLength)}`;
}

async function findLinkedTaskFolder(
  manager: EntityManager,
  connectionId: string,
  taskId: string,
): Promise<IntegrationExternalResourceEntity | null> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    relation: "managed_container",
    targetId: taskId,
    targetType: "task",
  });
  if (links.length === 0) return null;
  const resources = await manager.getRepository(IntegrationExternalResourceEntity).findBy({
    connectionId,
    id: In(links.map((link) => link.externalResourceId)),
    resourceKind: "google-drive.folder",
  });
  if (resources.length > 1) throw new Error(`Task ${taskId} has multiple Google Drive folders.`);
  return resources[0] ?? null;
}

function toReservation(resource: IntegrationExternalResourceEntity): TaskFolderReservation {
  const parentId = resource.parentProviderResourceId;
  if (parentId === null)
    throw new Error(`Google Drive folder ${resource.id} has no parent mapping.`);
  return {
    folderId: resource.providerResourceId,
    name: resource.name,
    parentId,
    resourceId: resource.id,
    status: resource.status === "active" ? "active" : "reserved",
  };
}

function cleanFolderNamePart(value: string): string {
  const sanitized = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    return character === "/" ||
      character === "\\" ||
      (codePoint !== undefined && (codePoint <= 31 || codePoint === 127))
      ? " "
      : character;
  }).join("");
  return sanitized.replace(/\s+/gu, " ").trim();
}
