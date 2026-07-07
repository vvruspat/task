import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { StatusEntity, WorkspaceMemberEntity } from "../persistence/entities/index.js";
import type { WorkspaceStatus } from "./statuses.contracts.js";
import type { StatusesReadStore } from "./statuses.store.js";

@Injectable()
export class TypeOrmStatusesReadStore implements StatusesReadStore {
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
