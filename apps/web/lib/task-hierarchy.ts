export type HierarchicalTask = {
  id: string;
  title: string;
  parentTaskId?: string | null;
};

export function filterTaskHierarchy<TTask extends HierarchicalTask>(
  tasks: readonly TTask[],
  matches: (task: TTask) => boolean,
): TTask[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const visibleTaskIds = new Set(tasks.filter(matches).map((task) => task.id));

  for (const task of tasks) {
    if (!visibleTaskIds.has(task.id)) continue;
    let parentTaskId = task.parentTaskId;
    const visitedTaskIds = new Set<string>();
    while (typeof parentTaskId === "string" && !visitedTaskIds.has(parentTaskId)) {
      visitedTaskIds.add(parentTaskId);
      const parentTask = taskById.get(parentTaskId);
      if (parentTask === undefined) break;
      visibleTaskIds.add(parentTask.id);
      parentTaskId = parentTask.parentTaskId;
    }
  }

  return tasks.filter((task) => visibleTaskIds.has(task.id));
}

export function parentTaskSortTitle<TTask extends HierarchicalTask>(
  task: TTask,
  taskById: ReadonlyMap<string, TTask>,
): string {
  if (typeof task.parentTaskId !== "string") return task.title;
  return taskById.get(task.parentTaskId)?.title ?? task.title;
}
