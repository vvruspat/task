import type { TaskSummary } from "@task/api-client";
import { produce } from "immer";
import type { WorkspaceBootstrap, WorkspaceProjectReconciliation } from "./workspace-contracts";

export function applyWorkspaceTaskUpdate(
  data: WorkspaceBootstrap,
  task: TaskSummary,
): WorkspaceBootstrap {
  if (hasNewerTaskSnapshot(data, task)) return data;
  return produce(data, (draft) => {
    const projectData = draft.projectData.find((item) => item.projectId === task.projectId);
    if (projectData !== undefined) {
      replaceTask(projectData.tasks, task);
      replaceTask(projectData.table.items, task);
      replaceTask(projectData.matrix.columns, task);
      for (const cell of projectData.matrix.cells) replaceTask(cell.tasks, task);
    }
    const myTaskIndex = draft.myTasks.items.findIndex((item) => item.id === task.id);
    if (task.assigneeUserId !== data.currentMember.userId) {
      if (myTaskIndex >= 0) {
        draft.myTasks.items.splice(myTaskIndex, 1);
        draft.myTasks.total = Math.max(0, draft.myTasks.total - 1);
      }
      return;
    }

    const status = draft.statuses.find((item) => item.id === task.statusId);
    const currentMyTask = myTaskIndex >= 0 ? draft.myTasks.items[myTaskIndex] : undefined;
    const projectTitle =
      draft.projects.find((project) => project.id === task.projectId)?.title ??
      draft.projectData.find((project) => project.projectId === task.projectId)?.projectTitle ??
      currentMyTask?.projectTitle ??
      "";
    const nextMyTask = {
      id: task.id,
      projectId: task.projectId,
      projectTitle,
      title: task.title,
      dueAt: task.dueAt ?? null,
      statusId: task.statusId ?? null,
      statusName: status?.name ?? null,
      statusColor: status?.color ?? null,
      position: task.position,
      updatedAt: task.updatedAt,
    };
    if (myTaskIndex >= 0) draft.myTasks.items[myTaskIndex] = nextMyTask;
    else {
      draft.myTasks.items.unshift(nextMyTask);
      draft.myTasks.total += 1;
      if (draft.myTasks.items.length > draft.myTasks.pageSize) draft.myTasks.items.pop();
    }
  });
}

export function workspaceTaskUpdateRequiresProjectReconciliation(
  data: WorkspaceBootstrap,
  task: TaskSummary,
): boolean {
  const current = findCurrentTask(data, task);
  if (current === undefined) return true;
  if (current.updatedAt > task.updatedAt) return false;
  return (
    current.parentTaskId !== task.parentTaskId ||
    current.position !== task.position ||
    current.statusId !== task.statusId
  );
}

export function applyWorkspaceProjectReconciliation(
  data: WorkspaceBootstrap,
  reconciliation: WorkspaceProjectReconciliation,
): WorkspaceBootstrap {
  return produce(data, (draft) => {
    const projectData = draft.projectData.find(
      (item) => item.projectId === reconciliation.projectId,
    );
    if (projectData !== undefined) {
      projectData.tasks = reconciliation.tasks;
      projectData.table = reconciliation.table;
      projectData.matrix = reconciliation.matrix;
    }
    draft.myTasks = reconciliation.myTasks;
  });
}

function hasNewerTaskSnapshot(data: WorkspaceBootstrap, task: TaskSummary): boolean {
  const currentTask = findCurrentTask(data, task);
  const myTask = data.myTasks.items.find((item) => item.id === task.id);
  const currentUpdatedAt = currentTask?.updatedAt ?? myTask?.updatedAt;
  return currentUpdatedAt !== undefined && currentUpdatedAt > task.updatedAt;
}

function findCurrentTask(data: WorkspaceBootstrap, task: TaskSummary): TaskSummary | undefined {
  const projectData = data.projectData.find((item) => item.projectId === task.projectId);
  return (
    projectData?.tasks.find((item) => item.id === task.id) ??
    projectData?.table.items.find((item) => item.id === task.id) ??
    projectData?.matrix.columns.find((item) => item.id === task.id) ??
    projectData?.matrix.cells.flatMap((cell) => cell.tasks).find((item) => item.id === task.id)
  );
}

function replaceTask(tasks: TaskSummary[], task: TaskSummary): void {
  const index = tasks.findIndex((item) => item.id === task.id);
  if (index < 0) return;
  const current = tasks[index];
  tasks[index] =
    task.commentCount === undefined && current?.commentCount !== undefined
      ? { ...task, commentCount: current.commentCount }
      : task;
}
