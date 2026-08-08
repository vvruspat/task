import type { TaskSummary } from "./tasks.contracts.js";

type TaskHierarchyNode = Pick<TaskSummary, "id" | "parentTaskId">;

export function collectTaskHierarchyIds(
  tasks: readonly TaskHierarchyNode[],
  rootTaskId: string,
): ReadonlySet<string> {
  const hierarchyIds = new Set([rootTaskId]);
  let previousSize = 0;

  while (hierarchyIds.size !== previousSize) {
    previousSize = hierarchyIds.size;
    for (const task of tasks) {
      if (task.parentTaskId !== null && hierarchyIds.has(task.parentTaskId)) {
        hierarchyIds.add(task.id);
      }
    }
  }

  return hierarchyIds;
}
