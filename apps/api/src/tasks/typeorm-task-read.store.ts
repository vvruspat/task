import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { ProjectEntity, TaskEntity, WorkspaceMemberEntity } from "../persistence/entities/index.js";
import type { TaskDetail, TaskSummary } from "./tasks.contracts.js";
import type { TaskReadStore } from "./tasks.store.js";

@Injectable()
export class TypeOrmTaskReadStore implements TaskReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listActiveForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadProject = await this.canReadProject(dataSource, workspaceId, projectId, userId);

    if (!canReadProject) {
      return null;
    }

    const tasks = await dataSource.getRepository(TaskEntity).find({
      where: { archivedAt: IsNull(), projectId, workspaceId },
      order: { parentTaskId: "ASC", position: "ASC", createdAt: "ASC" },
    });

    return tasks.map(toTaskSummary);
  }

  async getForProject(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadProject = await this.canReadProject(dataSource, workspaceId, projectId, userId);

    if (!canReadProject) {
      return null;
    }

    const task = await dataSource.getRepository(TaskEntity).findOneBy({
      id: taskId,
      projectId,
      workspaceId,
    });

    if (task === null) {
      return null;
    }

    return toTaskSummary(task);
  }

  private async canReadProject(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });

    if (membership === null) {
      return false;
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    return project !== null;
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

function toTaskSummary(task: TaskEntity): TaskSummary {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    parentTaskId: task.parentTaskId,
    title: task.title,
    description: task.description,
    statusId: task.statusId,
    assigneeUserId: task.assigneeUserId,
    createdByUserId: task.createdByUserId,
    position: task.position,
    dueAt: task.dueAt,
    sourceSkillId: task.sourceSkillId,
    sourceSkillVersionId: task.sourceSkillVersionId,
    metadata: task.metadata,
    archivedAt: task.archivedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
