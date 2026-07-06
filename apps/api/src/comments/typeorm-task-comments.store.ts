import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  CommentEntity,
  ProjectEntity,
  TaskEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type { CreateTaskCommentInput, TaskComment } from "./comments.contracts.js";
import type { TaskCommentCreateResult, TaskCommentsStore } from "./comments.store.js";

const commentWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmTaskCommentsStore implements TaskCommentsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskComment[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadTask = await this.canReadTask(dataSource, workspaceId, projectId, taskId, userId);

    if (!canReadTask) {
      return null;
    }

    const comments = await dataSource.getRepository(CommentEntity).find({
      where: { taskId, workspaceId },
      order: { createdAt: "ASC" },
    });

    return comments.map(toTaskComment);
  }

  async createForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskCommentInput,
  ): Promise<TaskCommentCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "task_not_found" };
    }

    if (!commentWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    if (task === null) {
      return { status: "task_not_found" };
    }

    const savedComment = await dataSource.transaction(async (manager): Promise<CommentEntity> => {
      const commentRepository = manager.getRepository(CommentEntity);
      const comment = commentRepository.create({
        workspaceId,
        taskId,
        authorUserId: userId,
        body: input.body,
      });
      const createdComment = await commentRepository.save(comment);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "comment.created",
        entityType: "comment",
        entityId: createdComment.id,
        payload: {
          projectId,
          taskId,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return createdComment;
    });

    return { comment: toTaskComment(savedComment), status: "created" };
  }

  private async canReadTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return false;
    }

    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);

    return task !== null;
  }

  private async getVisibleTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskEntity | null> {
    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return null;
    }

    return dataSource.getRepository(TaskEntity).findOneBy({
      archivedAt: IsNull(),
      id: taskId,
      projectId,
      workspaceId,
    });
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

function toTaskComment(comment: CommentEntity): TaskComment {
  return {
    id: comment.id,
    workspaceId: comment.workspaceId,
    taskId: comment.taskId,
    authorUserId: comment.authorUserId,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
