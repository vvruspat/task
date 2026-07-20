import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationFeedDto, TaskSubscriptionDto } from "./notifications.dto.js";
import type { NotificationsStore } from "./notifications.store.js";

@Injectable()
export class NotificationsService {
  constructor(private readonly store: NotificationsStore) {}

  async list(workspaceId: string, userId: string): Promise<NotificationFeedDto> {
    const feed = await this.store.list(workspaceId, userId);
    if (feed === null) throw new NotFoundException("Workspace is missing or not visible.");
    return new NotificationFeedDto(feed);
  }

  async markAllRead(workspaceId: string, userId: string): Promise<NotificationFeedDto> {
    const markedAt = await this.store.markAllRead(workspaceId, userId);
    if (markedAt === null) throw new NotFoundException("Workspace is missing or not visible.");
    return this.list(workspaceId, userId);
  }

  async subscription(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskSubscriptionDto> {
    const subscribed = await this.store.isSubscribed(workspaceId, projectId, taskId, userId);
    if (subscribed === null) throw new NotFoundException("Task is missing or not visible.");
    return new TaskSubscriptionDto(subscribed);
  }

  async subscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskSubscriptionDto> {
    this.assertMutationAllowed(await this.store.subscribe(workspaceId, projectId, taskId, userId));
    return new TaskSubscriptionDto(true);
  }

  async unsubscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskSubscriptionDto> {
    this.assertMutationAllowed(
      await this.store.unsubscribe(workspaceId, projectId, taskId, userId),
    );
    return new TaskSubscriptionDto(false);
  }

  private assertMutationAllowed(result: "forbidden" | "ok" | "task_not_found"): void {
    if (result === "forbidden")
      throw new ForbiddenException("Current user cannot change task subscriptions.");
    if (result === "task_not_found") throw new NotFoundException("Task is missing or not visible.");
  }
}
