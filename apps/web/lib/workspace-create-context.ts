import type { TaskSummary, WorkspaceStatus } from "@task/api-client";

export type WorkspaceCreateContext = Readonly<{
  labels: string[];
  projectlessProjectId: string | null;
  statuses: WorkspaceStatus[];
}>;

export function collectWorkspaceTaskLabels(tasks: readonly TaskSummary[]): string[] {
  const unique = new Map<string, string>();
  for (const task of tasks) {
    const labels = task.metadata["labels"];
    if (!Array.isArray(labels)) continue;
    for (const label of labels) {
      if (typeof label !== "string") continue;
      const trimmed = label.trim();
      const key = trimmed.toLocaleLowerCase("ru");
      if (trimmed.length > 0 && !unique.has(key)) unique.set(key, trimmed);
    }
  }
  return [...unique.values()].sort((left, right) => left.localeCompare(right, "ru"));
}

export function isWorkspaceCreateContext(value: unknown): value is WorkspaceCreateContext {
  return (
    typeof value === "object" &&
    value !== null &&
    "labels" in value &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === "string") &&
    "projectlessProjectId" in value &&
    (typeof value.projectlessProjectId === "string" || value.projectlessProjectId === null) &&
    "statuses" in value &&
    Array.isArray(value.statuses) &&
    value.statuses.every(isWorkspaceStatus)
  );
}

function isWorkspaceStatus(value: unknown): value is WorkspaceStatus {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "color" in value &&
    typeof value.color === "string" &&
    "position" in value &&
    typeof value.position === "string" &&
    "isDone" in value &&
    typeof value.isDone === "boolean" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string"
  );
}
