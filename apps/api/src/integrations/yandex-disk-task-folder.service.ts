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
// biome-ignore lint/style/useImportType: Nest constructor injection needs the client value at runtime.
import {
  joinYandexDiskPath,
  YandexDiskClient,
  type YandexDiskResource,
  yandexDiskFolderMimeType,
} from "./yandex-disk.client.js";
import type { YandexDiskAccessGrant } from "./yandex-disk-access.service.js";

const yandexDiskPluginKey = "yandex-disk";
const maxFolderNameLength = 240;

type FolderReservation = {
  name: string;
  parentPath: string | null;
  path: string;
  resourceId: string;
  status: "active" | "reserved";
};

type FolderTarget = { id: string; type: "project" | "task" };

export type YandexDiskTaskFolderContext = {
  access: YandexDiskAccessGrant;
  actorUserId: string | null;
  workspaceId: string;
};

@Injectable()
export class YandexDiskTaskFolderService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly diskClient: YandexDiskClient,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    context: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (context.pluginKey !== yandexDiskPluginKey) {
      throw new Error(`Unexpected integration plugin ${context.pluginKey}.`);
    }
    void event;
  }

  async ensureFolderForTask(
    taskId: string,
    context: YandexDiskTaskFolderContext,
  ): Promise<string | null> {
    return this.ensureTaskFolder(taskId, context);
  }

  private async ensureTaskFolder(
    taskId: string,
    context: YandexDiskTaskFolderContext,
    ancestors = new Set<string>(),
  ): Promise<string | null> {
    if (ancestors.has(taskId)) throw new Error(`Task hierarchy contains a cycle at ${taskId}.`);
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

    let reservation = await this.findReservation(context.access.connectionId, "task", task.id);
    if (reservation?.status === "active") return reservation.path;
    if (reservation === null) {
      const nextAncestors = new Set(ancestors).add(taskId);
      const parentPath =
        task.parentTaskId === null
          ? await this.ensureProjectFolder(project, context)
          : await this.ensureTaskFolder(task.parentTaskId, context, nextAncestors);
      if (parentPath === null) return null;
      reservation = await dataSource.transaction(async (manager) =>
        reserveFolder(manager, {
          actorUserId: context.actorUserId,
          connectionId: context.access.connectionId,
          name: buildYandexDiskTaskFolderName(task.title),
          parentPath,
          target: { id: task.id, type: "task" },
        }),
      );
    }
    return await this.provisionReservation(reservation, context.access);
  }

  private async ensureProjectFolder(
    project: ProjectEntity,
    context: YandexDiskTaskFolderContext,
  ): Promise<string | null> {
    let reservation = await this.findReservation(
      context.access.connectionId,
      "project",
      project.id,
    );
    if (reservation?.status === "active") return reservation.path;
    if (reservation === null) {
      const rootPath = await this.findManagedRootPath(
        context.access.connectionId,
        context.workspaceId,
      );
      if (rootPath === null) return null;
      const dataSource = await this.getInitializedDataSource();
      reservation = await dataSource.transaction(async (manager) =>
        reserveFolder(manager, {
          actorUserId: context.actorUserId,
          connectionId: context.access.connectionId,
          name: buildYandexDiskProjectFolderName(project.title),
          parentPath: rootPath,
          target: { id: project.id, type: "project" },
        }),
      );
    }
    return await this.provisionReservation(reservation, context.access);
  }

  private async provisionReservation(
    reservation: FolderReservation,
    access: YandexDiskAccessGrant,
  ): Promise<string> {
    if (reservation.status === "active") return reservation.path;
    if (reservation.parentPath === null) {
      throw new Error(`Reserved Yandex Disk folder ${reservation.resourceId} has no parent.`);
    }
    const folder = await this.diskClient.createFolder(
      access.accessToken,
      reservation.parentPath,
      reservation.name,
    );
    await this.markFolderActive(reservation.resourceId, access.connectionId, folder);
    return folder.path;
  }

  private async findReservation(
    connectionId: string,
    targetType: "project" | "task",
    targetId: string,
  ): Promise<FolderReservation | null> {
    const dataSource = await this.getInitializedDataSource();
    const resource = await findLinkedFolder(dataSource.manager, connectionId, {
      id: targetId,
      type: targetType,
    });
    return resource === null ? null : toReservation(resource);
  }

  private async findManagedRootPath(
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
      resourceKind: "yandex-disk.folder",
      status: "active",
    });
    if (resources.length > 1) throw new Error("Yandex Disk has multiple managed workspace roots.");
    return resources[0]?.providerResourceId ?? null;
  }

  private async markFolderActive(
    resourceId: string,
    connectionId: string,
    folder: YandexDiskResource,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource.getRepository(IntegrationExternalResourceEntity).update(
      { connectionId, id: resourceId },
      {
        lastSyncedAt: new Date(),
        metadata: { provisioningState: "ready", path: folder.path },
        mimeType: yandexDiskFolderMimeType,
        modifiedAt: folder.modifiedAt === null ? null : new Date(folder.modifiedAt),
        name: folder.name,
        parentProviderResourceId: folder.parentId,
        providerResourceId: folder.path,
        resourceKind: "yandex-disk.folder",
        status: "active",
        version: folder.version,
        webUrl: folder.webUrl,
      },
    );
    if (result.affected !== 1)
      throw new Error(`Yandex Disk folder mapping ${resourceId} was lost.`);
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

export function buildYandexDiskProjectFolderName(title: string): string {
  return buildYandexDiskFolderName(title, "Project");
}

export function buildYandexDiskTaskFolderName(title: string): string {
  return buildYandexDiskFolderName(title, "Task");
}

async function reserveFolder(
  manager: EntityManager,
  input: {
    actorUserId: string | null;
    connectionId: string;
    name: string;
    parentPath: string;
    target: FolderTarget;
  },
): Promise<FolderReservation> {
  const target =
    input.target.type === "task"
      ? await manager
          .getRepository(TaskEntity)
          .createQueryBuilder("target")
          .where("target.id = :targetId", { targetId: input.target.id })
          .setLock("pessimistic_write")
          .getOne()
      : await manager
          .getRepository(ProjectEntity)
          .createQueryBuilder("target")
          .where("target.id = :targetId", { targetId: input.target.id })
          .setLock("pessimistic_write")
          .getOne();
  if (target === null) throw new Error(`${input.target.type} ${input.target.id} was not found.`);
  const existing = await findLinkedFolder(manager, input.connectionId, input.target);
  if (existing !== null) return toReservation(existing);
  const resourceRepository = manager.getRepository(IntegrationExternalResourceEntity);
  let name = input.name;
  let path = joinYandexDiskPath(input.parentPath, name);
  let resource = await resourceRepository.findOneBy({
    connectionId: input.connectionId,
    providerResourceId: path,
  });
  if (resource !== null && (await isAssignedElsewhere(manager, resource.id, input.target))) {
    name = buildYandexDiskCollisionFolderName(input.name, input.target.id);
    path = joinYandexDiskPath(input.parentPath, name);
    resource = await resourceRepository.findOneBy({
      connectionId: input.connectionId,
      providerResourceId: path,
    });
  }
  if (resource !== null && (await isAssignedElsewhere(manager, resource.id, input.target))) {
    throw new Error(`Yandex Disk folder ${path} is already assigned elsewhere.`);
  } else {
    if (resource === null) {
      resource = resourceRepository.create({
        connectionId: input.connectionId,
        lastSyncedAt: new Date(),
        metadata: { provisioningState: "reserved", path },
        mimeType: yandexDiskFolderMimeType,
        modifiedAt: null,
        name,
        parentProviderResourceId: input.parentPath,
        providerResourceId: path,
        resourceKind: "yandex-disk.folder",
        status: "unavailable",
        version: null,
        webUrl: null,
      });
      await resourceRepository.save(resource);
    }
  }
  const linkRepository = manager.getRepository(IntegrationResourceLinkEntity);
  const linkExists = await linkRepository.existsBy({
    externalResourceId: resource.id,
    relation: "managed_container",
    targetId: input.target.id,
    targetType: input.target.type,
  });
  if (!linkExists) {
    await linkRepository.save(
      linkRepository.create({
        createdByUserId: input.actorUserId,
        externalResourceId: resource.id,
        metadata: { assignmentSource: "managed" },
        relation: "managed_container",
        targetId: input.target.id,
        targetType: input.target.type,
      }),
    );
  }
  return toReservation(resource);
}

async function isAssignedElsewhere(
  manager: EntityManager,
  externalResourceId: string,
  target: FolderTarget,
): Promise<boolean> {
  const links = await manager.getRepository(IntegrationResourceLinkEntity).findBy({
    externalResourceId,
    relation: "managed_container",
  });
  return links.some((link) => link.targetId !== target.id || link.targetType !== target.type);
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
    resourceKind: "yandex-disk.folder",
  });
  if (resources.length > 1)
    throw new Error(`${target.type} ${target.id} has multiple Yandex Disk folders.`);
  return resources[0] ?? null;
}

function toReservation(resource: IntegrationExternalResourceEntity): FolderReservation {
  return {
    name: resource.name,
    parentPath: resource.parentProviderResourceId,
    path: resource.providerResourceId,
    resourceId: resource.id,
    status: resource.status === "active" ? "active" : "reserved",
  };
}

function buildYandexDiskFolderName(value: string, fallback: string): string {
  const clean = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0);
    return /[\\/:*?"<>|]/u.test(character) ||
      (codePoint !== undefined && (codePoint <= 31 || codePoint === 127))
      ? " "
      : character;
  })
    .join("")
    .replace(/\s+/gu, " ")
    .trim();
  return (clean.length === 0 ? fallback : clean).slice(0, maxFolderNameLength);
}

export function buildYandexDiskCollisionFolderName(name: string, targetId: string): string {
  const suffix = ` [tAsk-${targetId.slice(0, 8)}]`;
  return `${name.slice(0, maxFolderNameLength - suffix.length).trimEnd()}${suffix}`;
}
