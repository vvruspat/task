import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, In, IsNull } from "typeorm";
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
import type {
  CreateAgentTaskCommentInput,
  TaskCommentCreateResult,
  TaskCommentsStore,
} from "./comments.store.js";

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

    if (!(await this.hasValidReferences(dataSource, workspaceId, taskId, input))) {
      return { status: "invalid_reference" };
    }

    const savedComment = await dataSource.transaction(async (manager): Promise<CommentEntity> => {
      const commentRepository = manager.getRepository(CommentEntity);
      const comment = commentRepository.create({
        workspaceId,
        taskId,
        authorUserId: userId,
        body: input.body,
        mentionedUserIds: input.mentionedUserIds ?? [],
        parentCommentId: input.parentCommentId ?? null,
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

  async createAgentReply(
    workspaceId: string,
    projectId: string,
    taskId: string,
    invokingUserId: string,
    input: CreateAgentTaskCommentInput,
  ): Promise<TaskComment | null> {
    const dataSource = await this.getInitializedDataSource();
    const task = await this.getVisibleTask(dataSource, workspaceId, projectId, taskId);
    if (task === null) return null;

    const rootComment = await dataSource.getRepository(CommentEntity).findOneBy({
      id: input.parentCommentId,
      parentCommentId: IsNull(),
      taskId,
      workspaceId,
    });
    if (rootComment === null) return null;

    const savedComment = await dataSource.transaction(async (manager): Promise<CommentEntity> => {
      const comment = manager.getRepository(CommentEntity).create({
        agentRunId: input.agentRunId,
        authorUserId: invokingUserId,
        body: input.body,
        mentionedUserIds: [],
        parentCommentId: input.parentCommentId,
        taskId,
        workspaceId,
      });
      const createdComment = await manager.getRepository(CommentEntity).save(comment);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        actorUserId: null,
        entityId: createdComment.id,
        entityType: "comment",
        eventType: "comment.created",
        payload: { agentRunId: input.agentRunId, projectId, taskId },
        workspaceId,
      });
      await manager.getRepository(ActivityEventEntity).save(activityEvent);
      return createdComment;
    });

    return toTaskComment(savedComment);
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

  private async hasValidReferences(
    dataSource: DataSource,
    workspaceId: string,
    taskId: string,
    input: CreateTaskCommentInput,
  ): Promise<boolean> {
    const parentCommentId = input.parentCommentId ?? null;
    const mentionedUserIds = input.mentionedUserIds ?? [];
    if (parentCommentId !== null) {
      const parent = await dataSource.getRepository(CommentEntity).findOneBy({
        id: parentCommentId,
        parentCommentId: IsNull(),
        taskId,
        workspaceId,
      });
      if (parent === null) return false;
    }

    if (mentionedUserIds.length === 0) return true;
    const members = await dataSource.getRepository(WorkspaceMemberEntity).findBy({
      userId: In(mentionedUserIds),
      workspaceId,
    });
    return new Set(members.map((member) => member.userId)).size === mentionedUserIds.length;
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
    agentRunId: comment.agentRunId,
    parentCommentId: comment.parentCommentId,
    mentionedUserIds: comment.mentionedUserIds,
    body: comment.body,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}
