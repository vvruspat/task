import type {
  CreateWorkspaceStatusInput,
  ReorderWorkspaceStatusesInput,
  UpdateWorkspaceStatusInput,
} from "@task/api-client";

const colorPattern = /^#[0-9a-f]{6}$/i;
const numericPattern = /^-?\d+(\.\d+)?$/;
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCreateProjectStatusInput(value: unknown): value is CreateWorkspaceStatusInput {
  return (
    isRecord(value) &&
    typeof value["name"] === "string" &&
    value["name"].trim().length > 0 &&
    typeof value["color"] === "string" &&
    colorPattern.test(value["color"]) &&
    typeof value["position"] === "string" &&
    numericPattern.test(value["position"]) &&
    (value["isDone"] === undefined || typeof value["isDone"] === "boolean")
  );
}

export function isUpdateProjectStatusInput(value: unknown): value is UpdateWorkspaceStatusInput {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  return (
    (value["name"] === undefined ||
      (typeof value["name"] === "string" && value["name"].trim().length > 0)) &&
    (value["color"] === undefined ||
      (typeof value["color"] === "string" && colorPattern.test(value["color"]))) &&
    (value["position"] === undefined ||
      (typeof value["position"] === "string" && numericPattern.test(value["position"]))) &&
    (value["isDone"] === undefined || typeof value["isDone"] === "boolean")
  );
}

export function isReorderProjectStatusesInput(
  value: unknown,
): value is ReorderWorkspaceStatusesInput {
  if (!isRecord(value) || !Array.isArray(value["statusIds"])) return false;
  const statusIds = value["statusIds"];
  return (
    statusIds.length > 0 &&
    statusIds.every(
      (statusId): statusId is string =>
        typeof statusId === "string" && uuidV4Pattern.test(statusId),
    ) &&
    new Set(statusIds).size === statusIds.length
  );
}
