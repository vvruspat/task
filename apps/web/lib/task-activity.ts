import type { TaskActivityEvent, TaskComment } from "@task/api-client";

export type TaskActivityContext = {
  memberName: (userId: string) => string | null;
  statusName: (statusId: string) => string | null;
};

export function formatTaskActivity(event: TaskActivityEvent, context: TaskActivityContext): string {
  if (event.eventType === "task.created") return "создал(а) задачу";
  if (event.eventType === "task.subtasks_created") {
    const count = readNumber(event.payload, "count");
    return count === null ? "добавил(а) подзадачи" : `добавил(а) подзадачи: ${count}`;
  }
  if (event.eventType === "task.status_updated") {
    const statusId = readString(event.payload, "statusId");
    if (statusId === null) return "убрал(а) статус задачи";
    return `изменил(а) статус на «${context.statusName(statusId) ?? "Неизвестный статус"}»`;
  }
  if (event.eventType === "task.assignee_updated") {
    const assigneeUserId = readString(event.payload, "assigneeUserId");
    if (assigneeUserId === null) return "снял(а) исполнителя";
    return `назначил(а) исполнителя ${context.memberName(assigneeUserId) ?? "Неизвестный пользователь"}`;
  }
  if (event.eventType === "task.due_date_updated") {
    const dueAt = readString(event.payload, "dueAt");
    return dueAt === null ? "убрал(а) срок" : `изменил(а) срок на ${formatActivityDate(dueAt)}`;
  }
  if (event.eventType === "task.updated") return formatUpdatedFields(event.payload);
  if (event.eventType === "task.moved") return "изменил(а) положение задачи";
  if (event.eventType === "task.bulk_updated") return "изменил(а) свойства задачи";
  if (event.eventType === "task.archived") return "архивировал(а) задачу";
  if (event.eventType === "task_skill.applied") {
    const count = readNumber(event.payload, "subtaskCount");
    return count === null
      ? "применил(а) шаблон"
      : `применил(а) шаблон и создал(а) подзадачи: ${count}`;
  }
  if (event.eventType === "attachment.created") return "добавил(а) вложение";
  return "изменил(а) задачу";
}

export function formatActivityTime(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "недавно";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(months, "month");
  return formatter.format(Math.round(months / 12), "year");
}

export function isTaskActivityEvent(value: unknown): value is TaskActivityEvent {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasNullableString(value, "actorUserId") &&
    hasString(value, "eventType") &&
    hasString(value, "entityId") &&
    hasString(value, "entityType") &&
    hasRecord(value, "payload") &&
    hasString(value, "createdAt")
  );
}

export function isTaskComment(value: unknown): value is TaskComment {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "taskId") &&
    hasString(value, "authorUserId") &&
    hasNullableString(value, "agentRunId") &&
    hasNullableString(value, "parentCommentId") &&
    hasStringArray(value, "mentionedUserIds") &&
    hasString(value, "body") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt")
  );
}

function formatUpdatedFields(payload: Record<string, unknown>): string {
  const fields = readUnknown(payload, "fields");
  if (!Array.isArray(fields)) return "изменил(а) задачу";
  const names = fields.filter((field): field is string => typeof field === "string");
  if (names.length === 1 && names[0] === "title") return "изменил(а) название задачи";
  if (names.length === 1 && names[0] === "description") return "изменил(а) описание задачи";
  if (names.length === 1 && names[0] === "metadata") return "изменил(а) labels задачи";
  return "изменил(а) свойства задачи";
}

function formatActivityDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

function readString(value: Record<string, unknown>, key: string): string | null {
  const property = value[key];
  return typeof property === "string" && property.length > 0 ? property : null;
}

function readNumber(value: Record<string, unknown>, key: string): number | null {
  const property = value[key];
  return typeof property === "number" && Number.isFinite(property) ? property : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUnknown(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof readUnknown(value, key) === "string";
}

function hasNullableString(value: Record<string, unknown>, key: string): boolean {
  const property = readUnknown(value, key);
  return typeof property === "string" || property === null;
}

function hasRecord(value: Record<string, unknown>, key: string): boolean {
  return isRecord(readUnknown(value, key));
}

function hasStringArray(value: Record<string, unknown>, key: string): boolean {
  const property = readUnknown(value, key);
  return Array.isArray(property) && property.every((item) => typeof item === "string");
}
