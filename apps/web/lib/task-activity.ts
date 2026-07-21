import type { TaskActivityEvent, TaskComment } from "@task/api-client";
import type { MessageValues } from "./i18n/i18n";
import type { MessageKey } from "./i18n/messages";

export type TaskActivityContext = {
  locale: "en" | "ru";
  memberName: (userId: string) => string | null;
  statusName: (statusId: string) => string | null;
  t: (key: MessageKey, values?: MessageValues) => string;
};

export function formatTaskActivity(event: TaskActivityEvent, context: TaskActivityContext): string {
  if (event.eventType === "task.created") return context.t("activity.event.created");
  if (event.eventType === "task.subtasks_created") {
    const count = readNumber(event.payload, "count");
    return count === null
      ? context.t("activity.event.subtasksAdded")
      : context.t("activity.event.subtasksAddedCount", { count });
  }
  if (event.eventType === "task.status_updated") {
    const statusId = readString(event.payload, "statusId");
    if (statusId === null) return context.t("activity.event.statusRemoved");
    return context.t("activity.event.statusChanged", {
      status: context.statusName(statusId) ?? context.t("activity.unknownStatus"),
    });
  }
  if (event.eventType === "task.assignee_updated") {
    const assigneeUserId = readString(event.payload, "assigneeUserId");
    if (assigneeUserId === null) return context.t("activity.event.assigneeRemoved");
    return context.t("activity.event.assigneeChanged", {
      assignee: context.memberName(assigneeUserId) ?? context.t("activity.unknownUser"),
    });
  }
  if (event.eventType === "task.due_date_updated") {
    const dueAt = readString(event.payload, "dueAt");
    return dueAt === null
      ? context.t("activity.event.dueRemoved")
      : context.t("activity.event.dueChanged", {
          date: formatActivityDate(dueAt, context.locale),
        });
  }
  if (event.eventType === "task.updated") return formatUpdatedFields(event.payload, context);
  if (event.eventType === "task.moved") return context.t("activity.event.moved");
  if (event.eventType === "task.bulk_updated") return context.t("activity.event.propertiesChanged");
  if (event.eventType === "task.archived") return context.t("activity.event.archived");
  if (event.eventType === "task_skill.applied") {
    const count = readNumber(event.payload, "subtaskCount");
    return count === null
      ? context.t("activity.event.templateApplied")
      : context.t("activity.event.templateAppliedCount", { count });
  }
  if (event.eventType === "attachment.created") return context.t("activity.event.attachmentAdded");
  return context.t("activity.event.changed");
}

export function formatActivityTime(
  value: string,
  locale: "en" | "ru",
  now: Date = new Date(),
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return locale === "ru" ? "недавно" : "recently";
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
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

function formatUpdatedFields(
  payload: Record<string, unknown>,
  context: TaskActivityContext,
): string {
  const fields = readUnknown(payload, "fields");
  if (!Array.isArray(fields)) return context.t("activity.event.changed");
  const names = fields.filter((field): field is string => typeof field === "string");
  if (names.length === 1 && names[0] === "title") return context.t("activity.event.titleChanged");
  if (names.length === 1 && names[0] === "description")
    return context.t("activity.event.descriptionChanged");
  if (names.length === 1 && names[0] === "metadata")
    return context.t("activity.event.labelsChanged");
  return context.t("activity.event.propertiesChanged");
}

function formatActivityDate(value: string, locale: "en" | "ru"): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
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
