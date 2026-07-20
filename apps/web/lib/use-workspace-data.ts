"use client";

import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import { produce } from "immer";
import { usePathname } from "next/navigation";
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import type { ApiFailure, WorkspaceBootstrap } from "./workspace-contracts";
import { isApiFailure } from "./workspace-contracts";
import { parseWorkspaceRealtimeChange, type WorkspaceRealtimeChange } from "./workspace-realtime";
import { useWorkspaceStore } from "./workspace-store";

type WorkspaceDataState = {
  data: WorkspaceBootstrap | null;
  error: string | null;
  loading: boolean;
};

type WorkspaceDataStore = WorkspaceDataState & {
  replace: (state: WorkspaceDataState) => void;
  update: (updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap) => void;
};

const workspaceRefreshEvent = "task:workspace-data-refresh";
export const workspaceRealtimeEvent = "task:workspace-realtime-event";
let pendingRequest: { selector: string | null; promise: Promise<WorkspaceBootstrap> } | null = null;
const realtimeConnections = new Map<string, { references: number; source: EventSource }>();
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const useWorkspaceDataStore = create<WorkspaceDataStore>()((set) => ({
  data: null,
  error: null,
  loading: true,
  replace: (state): void => set(state),
  update: (updater): void =>
    set((state) => (state.data === null ? state : { ...state, data: updater(state.data) })),
}));

export function notifyWorkspaceDataChanged(): void {
  window.dispatchEvent(new Event(workspaceRefreshEvent));
}

export function updateWorkspaceData(
  updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap,
): void {
  useWorkspaceDataStore.getState().update(updater);
}

export function updateWorkspaceTask(task: TaskSummary): void {
  updateWorkspaceData((data) =>
    produce(data, (draft) => {
      const projectData = draft.projectData.find((item) => item.projectId === task.projectId);
      if (projectData !== undefined) {
        replaceTask(projectData.tasks, task);
        replaceTask(projectData.table.items, task);
        replaceTask(projectData.matrix.columns, task);
        for (const cell of projectData.matrix.cells) replaceTask(cell.tasks, task);
      }
      const myTask = draft.myTasks.items.find((item) => item.id === task.id);
      if (myTask !== undefined) {
        const status = draft.statuses.find((item) => item.id === task.statusId);
        myTask.title = task.title;
        myTask.dueAt = task.dueAt ?? null;
        myTask.statusId = task.statusId ?? null;
        myTask.statusName = status?.name ?? null;
        myTask.statusColor = status?.color ?? null;
        myTask.position = task.position;
        myTask.updatedAt = task.updatedAt;
      }
    }),
  );
}

export function updateProjectStatuses(projectId: string, statuses: WorkspaceStatus[]): void {
  updateWorkspaceData((data) =>
    produce(data, (draft) => {
      draft.statuses = [
        ...draft.statuses.filter((status) => status.projectId !== projectId),
        ...statuses,
      ];
    }),
  );
}

function replaceTask(tasks: TaskSummary[], task: TaskSummary): void {
  const index = tasks.findIndex((item) => item.id === task.id);
  if (index >= 0) tasks[index] = task;
}

function isWorkspaceBootstrap(value: unknown): value is WorkspaceBootstrap {
  if (typeof value !== "object" || value === null) return false;
  return (
    "workspace" in value &&
    "availableWorkspaces" in value &&
    "dashboard" in value &&
    "myTasks" in value &&
    "projects" in value &&
    "statuses" in value &&
    "taskSkills" in value &&
    "confirmations" in value &&
    "agentRuns" in value &&
    "views" in value &&
    "projectData" in value &&
    Array.isArray(value.projects) &&
    Array.isArray(value.availableWorkspaces) &&
    Array.isArray(value.statuses) &&
    Array.isArray(value.taskSkills) &&
    Array.isArray(value.confirmations) &&
    Array.isArray(value.agentRuns) &&
    Array.isArray(value.views) &&
    Array.isArray(value.projectData)
  );
}

async function readJson(response: Response): Promise<WorkspaceBootstrap | ApiFailure> {
  const body: unknown = await response.json();
  if (isWorkspaceBootstrap(body) || isApiFailure(body)) return body;
  return { error: "The web API returned an invalid response." };
}

async function requestWorkspace(selector: string | null): Promise<WorkspaceBootstrap> {
  if (pendingRequest !== null && pendingRequest.selector === selector)
    return pendingRequest.promise;
  const query = selector === null ? "" : `?workspace=${encodeURIComponent(selector)}`;
  const promise = (async (): Promise<WorkspaceBootstrap> => {
    const result = await readJson(await fetch(`/api/workspace${query}`, { cache: "no-store" }));
    if (isApiFailure(result)) throw new Error(result.error);
    return result;
  })();
  pendingRequest = { selector, promise };
  try {
    return await promise;
  } finally {
    if (pendingRequest?.promise === promise) pendingRequest = null;
  }
}

export function useWorkspaceData(): WorkspaceDataState & {
  refresh: () => Promise<void>;
} {
  const pathname = usePathname();
  const routeWorkspaceSlug = pathname.match(/^\/w\/([^/]+)/)?.[1] ?? null;
  const selectedWorkspaceId = useWorkspaceStore((store) => store.selectedWorkspaceId);
  const setSelectedWorkspaceId = useWorkspaceStore((store) => store.setSelectedWorkspaceId);
  const data = useWorkspaceDataStore((store) => store.data);
  const error = useWorkspaceDataStore((store) => store.error);
  const loading = useWorkspaceDataStore((store) => store.loading);
  const workspaceSelector = routeWorkspaceSlug ?? selectedWorkspaceId;

  const load = useCallback(
    async (force: boolean): Promise<void> => {
      const current = useWorkspaceDataStore.getState();
      const matchesCurrentWorkspace =
        current.data !== null &&
        (workspaceSelector === null ||
          current.data.workspace.id === workspaceSelector ||
          current.data.workspace.slug === workspaceSelector);
      if (!force && matchesCurrentWorkspace) return;

      // Existing content remains mounted during background synchronization.
      if (current.data === null) current.replace({ data: null, error: null, loading: true });
      try {
        const result = await requestWorkspace(workspaceSelector);
        setSelectedWorkspaceId(result.workspace.id);
        const latest = useWorkspaceDataStore.getState();
        if (latest.data !== result || latest.error !== null || latest.loading) {
          latest.replace({ data: result, error: null, loading: false });
        }
      } catch (error: unknown) {
        const latest = useWorkspaceDataStore.getState();
        latest.replace({
          data: latest.data,
          error:
            latest.data === null
              ? error instanceof Error
                ? error.message
                : "Unable to reach the local web API."
              : null,
          loading: false,
        });
      }
    },
    [setSelectedWorkspaceId, workspaceSelector],
  );

  const refresh = useCallback(async (): Promise<void> => load(true), [load]);
  useEffect(() => {
    void load(false);
    const handleRefresh = (): void => void load(true);
    window.addEventListener(workspaceRefreshEvent, handleRefresh);
    return () => window.removeEventListener(workspaceRefreshEvent, handleRefresh);
  }, [load]);

  useEffect(() => {
    const workspaceId = data?.workspace.id;
    if (workspaceId === undefined) return;
    return retainRealtimeConnection(workspaceId);
  }, [data?.workspace.id]);

  return { data, error, loading, refresh };
}

function retainRealtimeConnection(workspaceId: string): () => void {
  const existing = realtimeConnections.get(workspaceId);
  if (existing !== undefined) {
    existing.references += 1;
    return () => releaseRealtimeConnection(workspaceId);
  }
  const source = new EventSource(
    `/api/workspace/events?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
  source.addEventListener("workspace.changed", handleWorkspaceRealtimeChange);
  realtimeConnections.set(workspaceId, { references: 1, source });
  return () => releaseRealtimeConnection(workspaceId);
}

function releaseRealtimeConnection(workspaceId: string): void {
  const connection = realtimeConnections.get(workspaceId);
  if (connection === undefined) return;
  connection.references -= 1;
  if (connection.references > 0) return;
  connection.source.close();
  realtimeConnections.delete(workspaceId);
}

function handleWorkspaceRealtimeChange(event: MessageEvent<string>): void {
  const change = parseWorkspaceRealtimeChange(event.data);
  if (change === null) return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceRealtimeChange>(workspaceRealtimeEvent, { detail: change }),
  );
  if (change.projectId !== null && change.taskId !== null) {
    void refreshRealtimeTask(change);
  }
  if (realtimeRefreshTimer !== null) clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(() => {
    realtimeRefreshTimer = null;
    notifyWorkspaceDataChanged();
  }, 250);
}

async function refreshRealtimeTask(change: WorkspaceRealtimeChange): Promise<void> {
  if (change.projectId === null || change.taskId === null) return;
  const query = new URLSearchParams({
    projectId: change.projectId,
    workspaceId: change.workspaceId,
  });
  try {
    const response = await fetch(`/api/workspace/tasks/${change.taskId}?${query}`, {
      cache: "no-store",
    });
    const value: unknown = await response.json();
    if (response.ok && isTaskSummaryValue(value)) updateWorkspaceTask(value);
  } catch {
    // The debounced full workspace refresh below remains the consistency fallback.
  }
}

function isTaskSummaryValue(value: unknown): value is TaskSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "title" in value &&
    typeof value.title === "string"
  );
}
