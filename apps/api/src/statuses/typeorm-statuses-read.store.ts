import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, QueryFailedError } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ProjectEntity,
  StatusEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import { selectDefaultTaskStatusId } from "../tasks/default-task-status.js";
import { requiredProjectStatusName } from "./required-project-statuses.js";
import type {
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";
import type {
  StatusesReadStore,
  StatusesWriteStore,
  StatusMutationResult,
  StatusReorderResult,
} from "./statuses.store.js";

const statusManagementRoles = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmStatusesReadStore implements StatusesReadStore, StatusesWriteStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<WorkspaceStatus[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (membership === null || project === null) {
      return null;
    }

    const statuses = await dataSource.getRepository(StatusEntity).find({
      where: { projectId, workspaceId },
      order: { position: "ASC", name: "ASC" },
    });

    return statuses.map((status) => toWorkspaceStatus(status));
  }

  async createForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, projectId, userId))) {
      return { status: "forbidden" };
    }

    const workspaceStatus = dataSource.getRepository(StatusEntity).create({
      workspaceId,
      projectId,
      name: input.name,
      color: input.color,
      position: input.position,
      isDone: input.isDone ?? false,
    });
    let savedStatus: StatusEntity;
    try {
      savedStatus = await dataSource.getRepository(StatusEntity).save(workspaceStatus);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "duplicate_name" };
      }
      throw error;
    }

    return { status: "created", workspaceStatus: toWorkspaceStatus(savedStatus) };
  }

  async updateForProject(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, projectId, userId))) {
      return { status: "forbidden" };
    }

    const statusRepository = dataSource.getRepository(StatusEntity);
    const workspaceStatus = await statusRepository.findOneBy({
      id: statusId,
      projectId,
      workspaceId,
    });
    if (workspaceStatus === null) {
      return { status: "status_not_found" };
    }

    const requiredName = requiredProjectStatusName(workspaceStatus.name);
    if (
      requiredName !== null &&
      input.name !== undefined &&
      requiredProjectStatusName(input.name) !== requiredName
    ) {
      return { status: "required_status" };
    }

    if (input.name !== undefined) workspaceStatus.name = input.name;
    if (input.color !== undefined) workspaceStatus.color = input.color;
    if (input.position !== undefined) workspaceStatus.position = input.position;
    if (input.isDone !== undefined) workspaceStatus.isDone = input.isDone;

    let savedStatus: StatusEntity;
    try {
      savedStatus = await statusRepository.save(workspaceStatus);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "duplicate_name" };
      }
      throw error;
    }
    return { status: "updated", workspaceStatus: toWorkspaceStatus(savedStatus) };
  }

  async deleteForProject(
    workspaceId: string,
    projectId: string,
    statusId: string,
    userId: string,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, projectId, userId))) {
      return { status: "forbidden" };
    }

    const statusRepository = dataSource.getRepository(StatusEntity);
    const workspaceStatus = await statusRepository.findOneBy({
      id: statusId,
      projectId,
      workspaceId,
    });
    if (workspaceStatus === null) {
      return { status: "status_not_found" };
    }
    if (requiredProjectStatusName(workspaceStatus.name) !== null) {
      return { status: "required_status" };
    }

    const result = await dataSource.transaction(async (manager): Promise<StatusMutationResult> => {
      const statusRepository = manager.getRepository(StatusEntity);
      const statuses = await statusRepository.find({
        lock: { mode: "pessimistic_write" },
        order: { position: "ASC" },
        where: { projectId, workspaceId },
      });
      const replacementStatusId = selectDefaultTaskStatusId(
        statuses.filter((status) => status.id !== statusId),
      );
      if (replacementStatusId === null) return { status: "last_status" };
      await manager
        .getRepository(TaskEntity)
        .update({ projectId, statusId, workspaceId }, { statusId: replacementStatusId });
      await statusRepository.remove(workspaceStatus);
      return { status: "updated", workspaceStatus: toWorkspaceStatus(workspaceStatus) };
    });
    return result;
  }

  async reorderForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: ReorderWorkspaceStatusesInput,
  ): Promise<StatusReorderResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, projectId, userId))) {
      return { status: "forbidden" };
    }
    return dataSource.transaction(async (manager): Promise<StatusReorderResult> => {
      const repository = manager.getRepository(StatusEntity);
      const statuses = await repository.find({
        where: { projectId, workspaceId },
        order: { position: "ASC", name: "ASC" },
        lock: { mode: "pessimistic_write" },
      });
      const existingIds = new Set(statuses.map((status) => status.id));
      if (
        statuses.length !== input.statusIds.length ||
        input.statusIds.some((statusId) => !existingIds.has(statusId))
      ) {
        return { status: "invalid_order" };
      }
      const byId = new Map(statuses.map((status) => [status.id, status]));
      const ordered: StatusEntity[] = [];
      for (const [index, statusId] of input.statusIds.entries()) {
        const workspaceStatus = byId.get(statusId);
        if (workspaceStatus === undefined) return { status: "invalid_order" };
        workspaceStatus.position = String((index + 1) * 1000);
        ordered.push(workspaceStatus);
      }
      const saved = await repository.save(ordered);
      const savedById = new Map(saved.map((status) => [status.id, status]));
      return {
        status: "reordered",
        workspaceStatuses: input.statusIds.flatMap((statusId) => {
          const status = savedById.get(statusId);
          return status === undefined ? [] : [toWorkspaceStatus(status)];
        }),
      };
    });
  }

  private async canManageStatuses(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
    if (membership === null || !statusManagementRoles.has(membership.role)) return false;
    return (
      (await dataSource.getRepository(ProjectEntity).findOneBy({ id: projectId, workspaceId })) !==
      null
    );
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toWorkspaceStatus(status: StatusEntity): WorkspaceStatus {
  return {
    id: status.id,
    workspaceId: status.workspaceId,
    projectId: status.projectId,
    name: status.name,
    color: status.color,
    position: status.position,
    isDone: status.isDone,
    createdAt: status.createdAt,
    updatedAt: status.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof QueryFailedError && hasPostgresErrorCode(error.driverError, "23505");
}

function hasPostgresErrorCode(value: unknown, expectedCode: string): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    value.code === expectedCode
  );
}
