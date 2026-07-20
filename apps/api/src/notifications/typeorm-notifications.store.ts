import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ArrayContains, type DataSource, In, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  CommentEntity,
  NotificationReadStateEntity,
  ProjectEntity,
  TaskEntity,
  TaskSubscriptionEntity,
  UserEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  NotificationFeed,
  NotificationItem,
  NotificationKind,
} from "./notifications.contracts.js";
import type { NotificationsStore, SubscriptionMutationResult } from "./notifications.store.js";

@Injectable()
export class TypeOrmNotificationsStore implements NotificationsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async list(workspaceId: string, userId: string): Promise<NotificationFeed | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId))) return null;

    const [subscriptions, mentionedComments, readState, events] = await Promise.all([
      dataSource.getRepository(TaskSubscriptionEntity).findBy({ workspaceId, userId }),
      dataSource.getRepository(CommentEntity).findBy({
        workspaceId,
        mentionedUserIds: ArrayContains([userId]),
      }),
      dataSource.getRepository(NotificationReadStateEntity).findOneBy({ workspaceId, userId }),
      dataSource.getRepository(ActivityEventEntity).find({
        where: { workspaceId },
        order: { createdAt: "DESC" },
        take: 300,
      }),
    ]);
    const subscribedAtByTaskId = new Map(
      subscriptions.map((subscription) => [subscription.taskId, subscription.createdAt]),
    );
    const mentionedCommentIds = new Set(mentionedComments.map((comment) => comment.id));
    const candidates = events.flatMap((event) => {
      const taskId = taskIdForEvent(event);
      if (taskId === null) return [];
      const isMention = event.entityType === "comment" && mentionedCommentIds.has(event.entityId);
      const subscribedAt = subscribedAtByTaskId.get(taskId);
      const kind = notificationKindForEvent(event, userId, isMention, subscribedAt);
      return kind === null ? [] : [{ event, kind, taskId }];
    });

    const taskIds = [...new Set(candidates.map((candidate) => candidate.taskId))];
    if (taskIds.length === 0) {
      return { items: [], lastReadAt: readState?.lastReadAt ?? null, unreadCount: 0 };
    }
    const tasks = await dataSource.getRepository(TaskEntity).findBy({
      archivedAt: IsNull(),
      id: In(taskIds),
      workspaceId,
    });
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const projectIds = [...new Set(tasks.map((task) => task.projectId))];
    const actorIds = [
      ...new Set(
        candidates.flatMap(({ event }) => (event.actorUserId === null ? [] : [event.actorUserId])),
      ),
    ];
    const [projects, actors] = await Promise.all([
      dataSource.getRepository(ProjectEntity).findBy({ id: In(projectIds), workspaceId }),
      actorIds.length === 0
        ? Promise.resolve([])
        : dataSource.getRepository(UserEntity).findBy({ id: In(actorIds) }),
    ]);
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const lastReadAt = readState?.lastReadAt ?? null;
    const items = candidates
      .flatMap<NotificationItem>(({ event, kind, taskId }) => {
        const task = taskById.get(taskId);
        const project = task === undefined ? undefined : projectById.get(task.projectId);
        if (task === undefined || project === undefined) return [];
        return [
          {
            actorDisplayName:
              event.actorUserId === null
                ? null
                : (actorById.get(event.actorUserId)?.displayName ?? null),
            actorUserId: event.actorUserId,
            createdAt: event.createdAt,
            eventType: event.eventType,
            id: event.id,
            kind,
            payload: event.payload,
            projectId: project.id,
            projectKey: project.key,
            read: lastReadAt !== null && event.createdAt <= lastReadAt,
            taskId: task.id,
            taskNumber: task.number,
            taskTitle: task.title,
            workspaceId,
          },
        ];
      })
      .slice(0, 100);
    return { items, lastReadAt, unreadCount: items.filter((item) => !item.read).length };
  }

  async markAllRead(workspaceId: string, userId: string): Promise<Date | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId))) return null;
    const lastReadAt = new Date();
    await dataSource
      .getRepository(NotificationReadStateEntity)
      .upsert({ lastReadAt, userId, workspaceId }, ["workspaceId", "userId"]);
    return lastReadAt;
  }

  async isSubscribed(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.canReadTask(dataSource, workspaceId, projectId, taskId, userId))) return null;
    return await dataSource
      .getRepository(TaskSubscriptionEntity)
      .existsBy({ taskId, userId, workspaceId });
  }

  async subscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<SubscriptionMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    const access = await this.subscriptionAccess(
      dataSource,
      workspaceId,
      projectId,
      taskId,
      userId,
    );
    if (access !== "ok") return access;
    await dataSource
      .getRepository(TaskSubscriptionEntity)
      .upsert({ taskId, userId, workspaceId }, ["workspaceId", "taskId", "userId"]);
    return "ok";
  }

  async unsubscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<SubscriptionMutationResult> {
    const dataSource = await this.getInitializedDataSource();
    const access = await this.subscriptionAccess(
      dataSource,
      workspaceId,
      projectId,
      taskId,
      userId,
    );
    if (access !== "ok") return access;
    await dataSource.getRepository(TaskSubscriptionEntity).delete({ taskId, userId, workspaceId });
    return "ok";
  }

  private async subscriptionAccess(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<SubscriptionMutationResult> {
    const membership = await dataSource
      .getRepository(WorkspaceMemberEntity)
      .findOneBy({ workspaceId, userId });
    if (membership === null || membership.role === "guest") return "forbidden";
    const task = await dataSource
      .getRepository(TaskEntity)
      .findOneBy({ archivedAt: IsNull(), id: taskId, projectId, workspaceId });
    return task === null ? "task_not_found" : "ok";
  }

  private async canReadTask(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean> {
    if (!(await this.hasMembership(dataSource, workspaceId, userId))) return false;
    return await dataSource
      .getRepository(TaskEntity)
      .existsBy({ archivedAt: IsNull(), id: taskId, projectId, workspaceId });
  }

  private async hasMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return await dataSource.getRepository(WorkspaceMemberEntity).existsBy({ workspaceId, userId });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
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

function taskIdForEvent(event: ActivityEventEntity): string | null {
  if (event.entityType === "task") return event.entityId;
  const value = event.payload["taskId"];
  return typeof value === "string" ? value : null;
}

export function notificationKindForEvent(
  event: Pick<ActivityEventEntity, "actorUserId" | "createdAt">,
  currentUserId: string,
  isMention: boolean,
  subscribedAt: Date | undefined,
): NotificationKind | null {
  if (isMention) return "mention";
  if (
    event.actorUserId === currentUserId ||
    subscribedAt === undefined ||
    event.createdAt < subscribedAt
  ) {
    return null;
  }
  return "task_changed";
}
