import type { NotificationFeed } from "./notifications.contracts.js";

export type SubscriptionMutationResult = "forbidden" | "ok" | "task_not_found";

export interface NotificationsStore {
  list(workspaceId: string, userId: string): Promise<NotificationFeed | null>;
  markAllRead(workspaceId: string, userId: string): Promise<Date | null>;
  isSubscribed(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<boolean | null>;
  subscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<SubscriptionMutationResult>;
  unsubscribe(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<SubscriptionMutationResult>;
}
