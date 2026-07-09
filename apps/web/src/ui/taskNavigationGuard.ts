import type { WorkspaceNavigationState } from "./navigation.js";

export function canLeaveTaskWithDraft(
  current: WorkspaceNavigationState,
  next: WorkspaceNavigationState,
  isDirty: boolean,
  confirmDiscard: () => boolean,
): boolean {
  const navigationChanged =
    current.projectId !== next.projectId ||
    current.routeId !== next.routeId ||
    current.taskId !== next.taskId;
  return !navigationChanged || !isDirty || confirmDiscard();
}
