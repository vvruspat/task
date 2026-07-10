import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, QueryFailedError } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { StatusEntity, TaskEntity, WorkspaceMemberEntity } from "../persistence/entities/index.js";
import type {
  CreateWorkspaceStatusInput,
  UpdateWorkspaceStatusInput,
  WorkspaceStatus,
} from "./statuses.contracts.js";
import type {
  StatusesReadStore,
  StatusesWriteStore,
  StatusMutationResult,
} from "./statuses.store.js";

const statusManagementRoles = new Set(["owner", "admin"]);

@Injectable()
export class TypeOrmStatusesReadStore implements StatusesReadStore, StatusesWriteStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForWorkspace(workspaceId: string, userId: string): Promise<WorkspaceStatus[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return null;
    }

    const statuses = await dataSource.getRepository(StatusEntity).find({
      where: { workspaceId },
      order: { position: "ASC", name: "ASC" },
    });

    return statuses.map((status) => toWorkspaceStatus(status));
  }

  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateWorkspaceStatusInput,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, userId))) {
      return { status: "forbidden" };
    }

    const workspaceStatus = dataSource.getRepository(StatusEntity).create({
      workspaceId,
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

  async updateForWorkspace(
    workspaceId: string,
    statusId: string,
    userId: string,
    input: UpdateWorkspaceStatusInput,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, userId))) {
      return { status: "forbidden" };
    }

    const statusRepository = dataSource.getRepository(StatusEntity);
    const workspaceStatus = await statusRepository.findOneBy({ id: statusId, workspaceId });
    if (workspaceStatus === null) {
      return { status: "status_not_found" };
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

  async deleteForWorkspace(
    workspaceId: string,
    statusId: string,
    userId: string,
  ): Promise<StatusMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canManageStatuses(dataSource, workspaceId, userId))) {
      return { status: "forbidden" };
    }

    const statusRepository = dataSource.getRepository(StatusEntity);
    const workspaceStatus = await statusRepository.findOneBy({ id: statusId, workspaceId });
    if (workspaceStatus === null) {
      return { status: "status_not_found" };
    }

    await dataSource.transaction(async (manager): Promise<void> => {
      await manager.getRepository(TaskEntity).update({ statusId, workspaceId }, { statusId: null });
      await manager.getRepository(StatusEntity).remove(workspaceStatus);
    });
    return { status: "updated", workspaceStatus: toWorkspaceStatus(workspaceStatus) };
  }

  private async canManageStatuses(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
    return membership !== null && statusManagementRoles.has(membership.role);
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
