export type NotificationKind = "mention" | "task_assigned" | "task_changed";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  workspaceId: string;
  taskId: string;
  projectId: string;
  projectKey: string;
  taskNumber: number;
  taskTitle: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
};

export type NotificationFeed = {
  items: NotificationItem[];
  unreadCount: number;
  lastReadAt: Date | null;
};

export type TaskSubscription = {
  subscribed: boolean;
};
