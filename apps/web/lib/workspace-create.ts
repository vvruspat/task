export function readCreatedWorkspaceId(value: unknown): string | null {
  return typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0
    ? value.id
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
