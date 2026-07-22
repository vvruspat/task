import type { NotificationFeed, TaskSubscription } from "@task/api-client";

export function isNotificationFeed(value: unknown): value is NotificationFeed {
  return (
    isRecord(value) &&
    Array.isArray(value["items"]) &&
    value["items"].every(isNotificationItem) &&
    typeof value["unreadCount"] === "number" &&
    (value["lastReadAt"] === null || typeof value["lastReadAt"] === "string")
  );
}

export function isTaskSubscription(value: unknown): value is TaskSubscription {
  return isRecord(value) && typeof value["subscribed"] === "boolean";
}

function isNotificationItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    (value["kind"] === "mention" ||
      value["kind"] === "task_assigned" ||
      value["kind"] === "task_changed") &&
    typeof value["taskId"] === "string" &&
    typeof value["projectKey"] === "string" &&
    typeof value["taskNumber"] === "number" &&
    typeof value["taskTitle"] === "string" &&
    typeof value["eventType"] === "string" &&
    typeof value["createdAt"] === "string" &&
    typeof value["read"] === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
