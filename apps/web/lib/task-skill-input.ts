import type {
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  TaskSkillApplyPreview,
  TaskSkillDetail,
  TaskSkillSubtaskDefinition,
  TaskSkillSummary,
  TaskSkillVersionSummary,
} from "@task/api-client";

export type AppliedTaskSkillSummary = {
  createdCount: number;
  projectId: string;
  rootTaskId: string;
};

export function splitTaskSkillList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
}

export function buildCreateTaskSkillInput(input: {
  aliases: string;
  description: string;
  name: string;
  subtasks: TaskSkillSubtaskDefinition[];
}): CreateTaskSkillInput {
  return {
    aliases: splitTaskSkillList(input.aliases),
    definition: {
      subtasks: normalizeTaskSkillSubtasks(input.subtasks),
    },
    description: nullableText(input.description),
    name: input.name.trim(),
  };
}

export function buildTaskSkillApplyInput(input: {
  addedSubtasks: string;
  projectId: string;
  removedSubtasks: string;
  rootTaskTitle: string;
}): PreviewTaskSkillApplyInput {
  const addSubtasks = splitTaskSkillList(input.addedSubtasks);
  const removeSubtasks = splitTaskSkillList(input.removedSubtasks);
  const overrides = {
    ...(addSubtasks.length > 0 ? { addSubtasks } : {}),
    ...(removeSubtasks.length > 0 ? { removeSubtasks } : {}),
  };
  return {
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
    projectId: input.projectId,
    rootTaskTitle: input.rootTaskTitle.trim(),
  };
}

export function extractTaskSkillSubtasks(detail: TaskSkillDetail): TaskSkillSubtaskDefinition[] {
  return getLatestTaskSkillVersion(detail)?.definition.subtasks ?? [];
}

export function normalizeTaskSkillSubtasks(
  subtasks: TaskSkillSubtaskDefinition[],
): TaskSkillSubtaskDefinition[] {
  return subtasks.flatMap((subtask) => {
    const title = subtask.title.trim();
    if (title.length === 0) return [];
    const description = subtask.description?.trim() || null;
    const labels = [
      ...new Set((subtask.labels ?? []).map((label) => label.trim()).filter(Boolean)),
    ];
    return [
      {
        title,
        ...(description === null ? {} : { description }),
        ...(subtask.assigneeUserId == null ? {} : { assigneeUserId: subtask.assigneeUserId }),
        ...(labels.length === 0 ? {} : { labels }),
      },
    ];
  });
}

export function getLatestTaskSkillVersion(
  detail: TaskSkillDetail,
): TaskSkillVersionSummary | undefined {
  return detail.versions.reduce<TaskSkillVersionSummary | undefined>(
    (latest, version) =>
      latest === undefined || version.version > latest.version ? version : latest,
    undefined,
  );
}

export function isTaskSkillDetail(value: unknown): value is TaskSkillDetail {
  if (!isTaskSkillSummary(value) || !("versions" in value) || !Array.isArray(value.versions))
    return false;
  return value.versions.every(
    (version) =>
      isRecord(version) &&
      hasString(version, "id") &&
      hasString(version, "workspaceId") &&
      hasString(version, "taskSkillId") &&
      hasString(version, "createdByUserId") &&
      hasString(version, "createdAt") &&
      typeof version["version"] === "number" &&
      isRecord(version["definition"]),
  );
}

export function isTaskSkillApplyPreview(value: unknown): value is TaskSkillApplyPreview {
  return (
    isRecord(value) &&
    hasString(value, "workspaceId") &&
    hasString(value, "projectId") &&
    hasString(value, "taskSkillId") &&
    hasString(value, "taskSkillVersionId") &&
    hasString(value, "rootTaskTitle") &&
    typeof value["taskSkillVersion"] === "number" &&
    Array.isArray(value["subtasks"]) &&
    value["subtasks"].every(isTaskSkillApplyPreviewSubtask)
  );
}

function isTaskSkillApplyPreviewSubtask(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasString(value, "title") &&
    (value["source"] === "skill" || value["source"] === "added") &&
    isOptionalNullableString(value["description"]) &&
    isOptionalNullableString(value["assigneeUserId"]) &&
    isStringArray(value["labels"])
  );
}

export function isAppliedTaskSkillSummary(value: unknown): value is AppliedTaskSkillSummary {
  return (
    isRecord(value) &&
    typeof value["createdCount"] === "number" &&
    hasString(value, "projectId") &&
    hasString(value, "rootTaskId")
  );
}

export function readApiError(value: unknown, fallback: string): string {
  return isRecord(value) && hasString(value, "error") ? value["error"] : fallback;
}

function isTaskSkillSummary(value: unknown): value is TaskSkillSummary {
  return (
    isRecord(value) &&
    hasString(value, "id") &&
    hasString(value, "workspaceId") &&
    hasString(value, "name") &&
    hasString(value, "createdByUserId") &&
    hasString(value, "createdAt") &&
    hasString(value, "updatedAt") &&
    isStringArray(value["aliases"]) &&
    isOptionalNullableString(value["description"]) &&
    isOptionalNullableString(value["archivedAt"])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString<Key extends string>(
  value: Record<string, unknown>,
  key: Key,
): value is Record<string, unknown> & Record<Key, string> {
  return typeof value[key] === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
