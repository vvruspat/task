import type { TaskSummary } from "@task/api-client";

export function isTaskSummary(value: unknown): value is TaskSummary {
  if (!isRecord(value)) return false;
  return (
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "projectId") &&
    typeof readProperty(value, "number") === "number" &&
    Number.isInteger(readProperty(value, "number")) &&
    isPositiveNumber(readProperty(value, "number")) &&
    hasString(value, "title") &&
    hasString(value, "createdByUserId") &&
    hasString(value, "position") &&
    isRecord(readProperty(value, "metadata")) &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt") &&
    hasOptionalNullableString(value, "parentTaskId") &&
    hasOptionalNullableString(value, "description") &&
    hasOptionalNullableString(value, "statusId") &&
    hasOptionalNullableString(value, "assigneeUserId") &&
    hasOptionalNullableString(value, "dueAt") &&
    hasOptionalNullableString(value, "sourceSkillId") &&
    hasOptionalNullableString(value, "sourceSkillVersionId") &&
    hasOptionalNullableString(value, "archivedAt") &&
    hasOptionalNonNegativeInteger(value, "commentCount")
  );
}

function hasOptionalNonNegativeInteger(value: Record<string, unknown>, key: string): boolean {
  if (!(key in value)) return true;
  return typeof value[key] === "number" && Number.isInteger(value[key]) && value[key] >= 0;
}

function hasOptionalNullableString(value: Record<string, unknown>, key: string): boolean {
  if (!(key in value)) return true;
  return value[key] === null || typeof value[key] === "string";
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function isPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}

function readProperty(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
