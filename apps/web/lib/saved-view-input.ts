import type { CreateSavedViewInput, UpdateSavedViewInput } from "@task/api-client";

export function isCreateSavedViewInput(value: unknown): value is CreateSavedViewInput {
  return (
    isRecord(value) &&
    isName(value["name"]) &&
    isVisibility(value["visibility"]) &&
    isLayout(value["layout"]) &&
    isSettings(value["settings"]) &&
    isOptionalNullableString(value["description"]) &&
    isOptionalNullableString(value["projectId"])
  );
}

export function isUpdateSavedViewInput(value: unknown): value is UpdateSavedViewInput {
  if (!isRecord(value)) return false;
  const hasField = ["name", "description", "projectId", "visibility", "layout", "settings"].some(
    (key) => key in value,
  );
  return (
    hasField &&
    (value["name"] === undefined || isName(value["name"])) &&
    isOptionalNullableString(value["description"]) &&
    isOptionalNullableString(value["projectId"]) &&
    (value["visibility"] === undefined || isVisibility(value["visibility"])) &&
    (value["layout"] === undefined || isLayout(value["layout"])) &&
    (value["settings"] === undefined || isSettings(value["settings"]))
  );
}

function isSettings(value: unknown): boolean {
  return (
    isRecord(value) &&
    isGrouping(value["grouping"]) &&
    isGrouping(value["subGrouping"]) &&
    isOrdering(value["ordering"]) &&
    (value["orderDirection"] === "asc" || value["orderDirection"] === "desc") &&
    typeof value["showSubtasks"] === "boolean" &&
    typeof value["showEmptyGroups"] === "boolean" &&
    Array.isArray(value["displayProperties"]) &&
    value["displayProperties"].every(isDisplayProperty)
  );
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isName(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
function isLayout(value: unknown): boolean {
  return value === "list" || value === "board" || value === "matrix";
}
function isVisibility(value: unknown): boolean {
  return value === "private" || value === "workspace";
}
function isGrouping(value: unknown): boolean {
  return value === "none" || value === "status" || value === "project" || value === "parent_task";
}
function isOrdering(value: unknown): boolean {
  return (
    value === "manual" ||
    value === "title" ||
    value === "status" ||
    value === "created_at" ||
    value === "updated_at" ||
    value === "due_at"
  );
}
function isDisplayProperty(value: unknown): boolean {
  return (
    value === "status" ||
    value === "project" ||
    value === "assignee" ||
    value === "due_at" ||
    value === "created_at" ||
    value === "updated_at"
  );
}
function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}
