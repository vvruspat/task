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
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type { CreateTaskInput, TaskDetail, TaskSummary } from "./tasks.contracts.js";
import type { TaskCreateResult, TaskReadStore } from "./tasks.store.js";

const taskWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

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

  async createForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ): Promise<TaskCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "project_not_found" };
    }

    if (!taskWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "project_not_found" };
    }

    if (input.parentTaskId !== undefined && input.parentTaskId !== null) {
      const parentTask = await dataSource.getRepository(TaskEntity).findOneBy({
        id: input.parentTaskId,
        projectId,
        workspaceId,
      });

      if (parentTask === null) {
        return { status: "invalid_parent_task" };
      }
    }

    const savedTask = await dataSource.transaction(async (manager): Promise<TaskEntity> => {
      const taskRepository = manager.getRepository(TaskEntity);
      const task = taskRepository.create({
        workspaceId,
        projectId,
        parentTaskId: input.parentTaskId ?? null,
        title: input.title,
        description: input.description ?? null,
        createdByUserId: userId,
        position: input.position ?? "0",
        dueAt: input.dueAt === undefined || input.dueAt === null ? null : new Date(input.dueAt),
        metadata: input.metadata ?? {},
      });
      const createdTask = await taskRepository.save(task);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "task.created",
        entityType: "task",
        entityId: createdTask.id,
        payload: {
          projectId,
          title: createdTask.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return createdTask;
    });

    return { status: "created", task: toTaskSummary(savedTask) };
  }

  private async canReadProject(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return false;
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    return project !== null;
  }

  private async getWorkspaceMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity | null> {
    return dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
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
