import type { WorkspaceSummary } from "@task/api-client";

export function readCreatedWorkspace(value: unknown): Pick<WorkspaceSummary, "id" | "slug"> | null {
  if (typeof value !== "object" || value === null) return null;
  const id = "id" in value ? value.id : undefined;
  const slug = "slug" in value ? value.slug : undefined;
  return typeof id === "string" && id.length > 0 && typeof slug === "string" && slug.length > 0
    ? { id, slug }
    : null;
}

export function readWorkspaceCreateError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
