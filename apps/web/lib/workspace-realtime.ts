export type WorkspaceRealtimeChange = {
  id: string;
  kind: "changed";
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  occurredAt: string;
};

export function parseWorkspaceRealtimeChange(value: string): WorkspaceRealtimeChange | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (
      !("kind" in parsed) ||
      parsed.kind !== "changed" ||
      !("id" in parsed) ||
      typeof parsed.id !== "string" ||
      !("workspaceId" in parsed) ||
      typeof parsed.workspaceId !== "string" ||
      !("projectId" in parsed) ||
      (parsed.projectId !== null && typeof parsed.projectId !== "string") ||
      !("taskId" in parsed) ||
      (parsed.taskId !== null && typeof parsed.taskId !== "string") ||
      !("occurredAt" in parsed) ||
      typeof parsed.occurredAt !== "string"
    ) {
      return null;
    }
    return {
      id: parsed.id,
      kind: "changed",
      workspaceId: parsed.workspaceId,
      projectId: parsed.projectId,
      taskId: parsed.taskId,
      occurredAt: parsed.occurredAt,
    };
  } catch {
    return null;
  }
}
