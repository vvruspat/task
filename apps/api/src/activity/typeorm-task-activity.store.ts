import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  ProjectEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { TaskActivityEvent } from "./activity.contracts.js";
import type { TaskActivityStore } from "./activity.store.js";

@Injectable()
export class TypeOrmTaskActivityStore implements TaskActivityStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskActivityEvent[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadTask = await this.canReadTask(dataSource, workspaceId, projectId, taskId, userId);

    if (!canReadTask) {
      return null;
    }

    const events = await dataSource
      .getRepository(ActivityEventEntity)
      .createQueryBuilder("activity")
      .where("activity.workspace_id = :workspaceId", { workspaceId })
      .andWhere(
        "(activity.entity_type = :taskEntityType AND activity.entity_id = :taskId OR activity.payload ->> 'taskId' = :taskId)",
        { taskEntityType: "task", taskId },
      )
      .orderBy("activity.created_at", "DESC")
      .getMany();

    return events.map(toTaskActivityEvent);
  }

  private async canReadTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return false;
    }

    const project = await dataSource
      .getRepository(ProjectEntity)
      .findOneBy({ id: projectId, workspaceId });

    if (project === null) {
      return false;
    }

    const task = await dataSource.getRepository(TaskEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskId,
      projectId,
      workspaceId,
    });

    return task !== null;
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

function toTaskActivityEvent(event: ActivityEventEntity): TaskActivityEvent {
  return {
    id: event.id,
    actorUserId: event.actorUserId,
    eventType: event.eventType,
    entityId: event.entityId,
    entityType: event.entityType,
    payload: event.payload,
    createdAt: event.createdAt,
  };
}
