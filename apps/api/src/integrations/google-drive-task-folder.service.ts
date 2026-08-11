import { Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import { type DataSource, type EntityManager, In } from "typeorm";
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
import type { GoogleDriveAccessGrant } from "./google-drive-access.service.js";

const googleDrivePluginKey = "google-drive";
const maxFolderNameLength = 240;

type TaskFolderReservation = {
  folderId: string;
  name: string;
  parentId: string | null;
  resourceId: string;
  status: "active" | "reserved";
};

type FolderTarget = {
  id: string;
  type: "project" | "task";
};

export type GoogleDriveTaskFolderContext = {
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
    private readonly driveClient: GoogleDriveClient,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (handlerContext.pluginKey !== googleDrivePluginKey) {
      throw new Error(`Unexpected integration plugin ${handlerContext.pluginKey}.`);
    }
    // Folders are provisioned lazily by the attachment exporter. Keeping this
    // handler registered lets the integration retain one ordered event pipeline.
    void event;
  }

  async ensureFolderForTask(
    taskId: string,
    context: GoogleDriveTaskFolderContext,
  ): Promise<string | null> {
    return this.ensureTaskFolder(taskId, context);
  }

  private async ensureTaskFolder(
    taskId: string,
    context: GoogleDriveTaskFolderContext,
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

    let reservation = await this.findTaskFolderReservation(context.access.connectionId, task.id);
    if (reservation?.status === "active") return reservation.folderId;
    if (reservation === null) {
      const parentId =
        task.parentTaskId === null
          ? await this.ensureProjectFolder(project, context)
          : await this.ensureTaskFolder(task.parentTaskId, context, nextAncestors);
      if (parentId === null) return null;
      const generatedFolderId = await this.driveClient.generateFileId(context.access.accessToken);
      reservation = await dataSource.transaction(async (manager) =>
        this.reserveTaskFolder(manager, {
          actorUserId: context.actorUserId,
          connectionId: context.access.connectionId,
          generatedFolderId,
          name: buildGoogleDriveTaskFolderName(task.title),
          parentId,
          taskId: task.id,
        }),
      );
    }
    if (reservation.status === "active") return reservation.folderId;
    if (reservation.parentId === null) {
      throw new Error(`Reserved Google Drive folder ${reservation.resourceId} has no parent.`);
    }

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
    await this.markFolderActive(reservation.resourceId, context.access.connectionId, folder, {
      id: task.id,
      type: "task",
    });
    return folder.id;
  }

  private async ensureProjectFolder(
    project: ProjectEntity,
    context: GoogleDriveTaskFolderContext,
  ): Promise<string | null> {
    let reservation = await this.findProjectFolderReservation(
      context.access.connectionId,
      project.id,
    );
    if (reservation?.status === "active") return reservation.folderId;
    if (reservation === null) {
      const parentId = await this.findManagedRootId(
        context.access.connectionId,
        context.workspaceId,
      );
      if (parentId === null) return null;
      const generatedFolderId = await this.driveClient.generateFileId(context.access.accessToken);
      const dataSource = await this.getInitializedDataSource();
      reservation = await dataSource.transaction(async (manager) =>
        this.reserveProjectFolder(manager, {
          actorUserId: context.actorUserId,
          connectionId: context.access.connectionId,
          generatedFolderId,
          name: buildGoogleDriveProjectFolderName(project.title),
          parentId,
          projectId: project.id,
        }),
      );
    }
    if (reservation.status === "active") return reservation.folderId;
    if (reservation.parentId === null) {
      throw new Error(`Reserved Google Drive folder ${reservation.resourceId} has no parent.`);
    }
    const folder = await this.driveClient.createFolder(context.access.accessToken, {
      appProperties: {
        tAskIntegrationId: context.installationId,
        tAskProjectId: project.id,
        tAskWorkspaceId: context.workspaceId,
      },
      folderId: reservation.folderId,
      name: reservation.name,
      parentId: reservation.parentId,
    });
    await this.markFolderActive(reservation.resourceId, context.access.connectionId, folder, {
      id: project.id,
      type: "project",
    });
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
    const existing = await findLinkedFolder(manager, input.connectionId, {
      id: input.taskId,
      type: "task",
    });
    if (existing !== null) return toReservation(existing);

    const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
    const resource = resourceRepository.create({
      connectionId: input.connectionId,
      lastSyncedAt: new Date(),
      metadata: { provisioningState: "reserved", targetId: input.taskId, targetType: "task" },
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
        metadata: { assignmentSource: "managed" },
        relation: "managed_container",
        targetId: input.taskId,
        targetType: "task",
      }),
    );
    return toReservation(resource);
  }

  private async reserveProjectFolder(
    manager: EntityManager,
    input: {
      actorUserId: string | null;
      connectionId: string;
      generatedFolderId: string;
      name: string;
      parentId: string;
      projectId: string;
    },
  ): Promise<TaskFolderReservation> {
    const project = await manager
      .getRepository(ProjectEntity)
      .createQueryBuilder("project")
      .where("project.id = :projectId", { projectId: input.projectId })
      .setLock("pessimistic_write")
      .getOne();
    if (project === null) {
      throw new Error(`Project ${input.projectId} was not found while reserving a folder.`);
    }
    const existing = await findLinkedFolder(manager, input.connectionId, {
      id: input.projectId,
      type: "project",
    });
    if (existing !== null) return toReservation(existing);

    const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
    const resource = resourceRepository.create({
      connectionId: input.connectionId,
      lastSyncedAt: new Date(),
      metadata: {
        provisioningState: "reserved",
        targetId: input.projectId,
        targetType: "project",
      },
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
        metadata: { assignmentSource: "managed" },
        relation: "managed_container",
        targetId: input.projectId,
        targetType: "project",
      }),
    );
    return toReservation(resource);
  }

  private async findTaskFolderReservation(
    connectionId: string,
    taskId: string,
  ): Promise<TaskFolderReservation | null> {
    const dataSource = await this.getInitializedDataSource();
    const resource = await findLinkedFolder(dataSource.manager, connectionId, {
      id: taskId,
      type: "task",
    });
    return resource === null ? null : toReservation(resource);
  }

  private async findProjectFolderReservation(
    connectionId: string,
    projectId: string,
  ): Promise<TaskFolderReservation | null> {
    const dataSource = await this.getInitializedDataSource();
    const resource = await findLinkedFolder(dataSource.manager, connectionId, {
      id: projectId,
      type: "project",
    });
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

  private async markFolderActive(
    resourceId: string,
    connectionId: string,
    folder: GoogleDriveFolder,
    target: FolderTarget,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource.getRepository(IntegrationExternalResourceEntity).update(
      { connectionId, id: resourceId },
      {
        lastSyncedAt: new Date(),
        metadata: {
          provisioningState: "ready",
          targetId: target.id,
          targetType: target.type,
        },
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

export function buildGoogleDriveProjectFolderName(title: string): string {
  return buildGoogleDriveFolderName(title, "Project");
}

export function buildGoogleDriveTaskFolderName(title: string): string {
  return buildGoogleDriveFolderName(title, "Task");
}

async function findLinkedFolder(
  manager: EntityManager,
  connectionId: string,
  target: FolderTarget,
): Promise<IntegrationExternalResourceEntity | null> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    relation: "managed_container",
    targetId: target.id,
    targetType: target.type,
  });
  if (links.length === 0) return null;
  const resources = await manager.getRepository(IntegrationExternalResourceEntity).findBy({
    connectionId,
    id: In(links.map((link) => link.externalResourceId)),
    resourceKind: "google-drive.folder",
  });
  if (resources.length > 1) {
    throw new Error(`${target.type} ${target.id} has multiple Google Drive folders.`);
  }
  return resources[0] ?? null;
}

function toReservation(resource: IntegrationExternalResourceEntity): TaskFolderReservation {
  const parentId = resource.parentProviderResourceId;
  if (parentId === null && resource.status !== "active") {
    throw new Error(`Google Drive folder ${resource.id} has no parent mapping.`);
  }
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

function buildGoogleDriveFolderName(value: string, fallback: string): string {
  const clean = cleanFolderNamePart(value);
  return (clean.length === 0 ? fallback : clean).slice(0, maxFolderNameLength);
}
