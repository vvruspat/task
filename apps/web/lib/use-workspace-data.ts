"use client";

import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import { produce } from "immer";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { LatestRequestCoordinator } from "./latest-request";
import type { ApiFailure, WorkspaceBootstrap, WorkspaceRequired } from "./workspace-contracts";
import { isApiFailure, isWorkspaceRequired } from "./workspace-contracts";
import {
  applyWorkspaceMemberRealtimeChange,
  findFallbackWorkspaceId,
  parseWorkspaceRealtimeChange,
  type WorkspaceRealtimeChange,
} from "./workspace-realtime";
import { useWorkspaceStore } from "./workspace-store";

type WorkspaceDataState = {
  data: WorkspaceBootstrap | null;
  error: string | null;
  loading: boolean;
  requiresWorkspace: boolean;
};

type WorkspaceDataStore = WorkspaceDataState & {
  replace: (state: WorkspaceDataState) => void;
  update: (updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap) => void;
};

const workspaceRefreshEvent = "task:workspace-data-refresh";
const workspaceMembershipRemovedEvent = "task:workspace-membership-removed";
export const workspaceRealtimeEvent = "task:workspace-realtime-event";
const workspaceRequestCoordinator = new LatestRequestCoordinator<
  string | null,
  WorkspaceBootstrap | WorkspaceRequired
>();
const realtimeConnections = new Map<string, { references: number; source: EventSource }>();
let realtimeRefreshTimer: ReturnType<typeof setTimeout> | null = null;

const useWorkspaceDataStore = create<WorkspaceDataStore>()((set) => ({
  data: null,
  error: null,
  loading: true,
  requiresWorkspace: false,
  replace: (state): void => set(state),
  update: (updater): void =>
    set((state) => (state.data === null ? state : { ...state, data: updater(state.data) })),
}));

export function notifyWorkspaceDataChanged(): void {
  window.dispatchEvent(new Event(workspaceRefreshEvent));
}

export function resetWorkspaceData(): void {
  workspaceRequestCoordinator.cancel();
  if (realtimeRefreshTimer !== null) {
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = null;
  }
  useWorkspaceDataStore.getState().replace({
    data: null,
    error: null,
    loading: true,
    requiresWorkspace: false,
  });
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
  if (index < 0) return;
  const current = tasks[index];
  tasks[index] =
    task.commentCount === undefined && current?.commentCount !== undefined
      ? { ...task, commentCount: current.commentCount }
      : task;
}

function isWorkspaceBootstrap(value: unknown): value is WorkspaceBootstrap {
  if (typeof value !== "object" || value === null) return false;
  return (
    "workspace" in value &&
    "currentMember" in value &&
    "availableWorkspaces" in value &&
    "myTasks" in value &&
    "projects" in value &&
    "statuses" in value &&
    "taskSkills" in value &&
    "confirmations" in value &&
    "agentRuns" in value &&
    "views" in value &&
    "projectData" in value &&
    Array.isArray(value.projects) &&
    typeof value.currentMember === "object" &&
    value.currentMember !== null &&
    Array.isArray(value.availableWorkspaces) &&
    Array.isArray(value.statuses) &&
    Array.isArray(value.taskSkills) &&
    Array.isArray(value.confirmations) &&
    Array.isArray(value.agentRuns) &&
    Array.isArray(value.views) &&
    Array.isArray(value.projectData)
  );
}

async function readJson(
  response: Response,
): Promise<WorkspaceBootstrap | WorkspaceRequired | ApiFailure> {
  const body: unknown = await response.json();
  if (isWorkspaceBootstrap(body) || isWorkspaceRequired(body) || isApiFailure(body)) return body;
  return { error: "workspace_invalid_response" };
}

async function requestWorkspace(
  selector: string | null,
  signal: AbortSignal,
): Promise<WorkspaceBootstrap | WorkspaceRequired> {
  const query = selector === null ? "" : `?workspace=${encodeURIComponent(selector)}`;
  const result = await readJson(
    await fetch(`/api/workspace${query}`, { cache: "no-store", signal }),
  );
  if (isApiFailure(result)) throw new Error(result.error);
  return result;
}

export function useWorkspaceData(): WorkspaceDataState & {
  refresh: () => Promise<void>;
} {
  const pathname = usePathname();
  const router = useRouter();
  const routeWorkspaceSlug = pathname.match(/^\/w\/([^/]+)/)?.[1] ?? null;
  const selectedWorkspaceId = useWorkspaceStore((store) => store.selectedWorkspaceId);
  const setSelectedWorkspaceId = useWorkspaceStore((store) => store.setSelectedWorkspaceId);
  const setSelectedProjectId = useWorkspaceStore((store) => store.setSelectedProjectId);
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
      if (current.data === null) {
        current.replace({ data: null, error: null, loading: true, requiresWorkspace: false });
      }
      const request = workspaceRequestCoordinator.request(workspaceSelector, (signal) =>
        requestWorkspace(workspaceSelector, signal),
      );
      try {
        const result = await request.promise;
        if (!workspaceRequestCoordinator.isLatest(request)) return;
        if (isWorkspaceRequired(result)) {
          setSelectedWorkspaceId(null);
          useWorkspaceDataStore.getState().replace({
            data: null,
            error: null,
            loading: false,
            requiresWorkspace: true,
          });
          return;
        }
        setSelectedWorkspaceId(result.workspace.id);
        const latest = useWorkspaceDataStore.getState();
        if (latest.data !== result || latest.error !== null || latest.loading) {
          latest.replace({ data: result, error: null, loading: false, requiresWorkspace: false });
        }
      } catch (error: unknown) {
        if (!workspaceRequestCoordinator.isLatest(request) || request.signal.aborted) return;
        const latest = useWorkspaceDataStore.getState();
        latest.replace({
          data: latest.data,
          error:
            latest.data === null
              ? error instanceof Error
                ? error.message
                : "workspace_unreachable"
              : null,
          loading: false,
          requiresWorkspace: false,
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

  useEffect(() => {
    const handleMembershipRemoved = (event: Event): void => {
      if (!(event instanceof CustomEvent)) return;
      const change: unknown = event.detail;
      if (!isCurrentMembershipRemoval(change)) return;
      const current = useWorkspaceDataStore.getState().data;
      if (
        current === null ||
        current.workspace.id !== change.workspaceId ||
        current.currentMember.id !== change.memberId
      ) {
        return;
      }
      const fallbackWorkspaceId = findFallbackWorkspaceId(current, change.workspaceId);
      workspaceRequestCoordinator.cancel();
      setSelectedWorkspaceId(fallbackWorkspaceId);
      setSelectedProjectId(null);
      useWorkspaceDataStore.getState().replace({
        data: null,
        error: null,
        loading: fallbackWorkspaceId !== null,
        requiresWorkspace: fallbackWorkspaceId === null,
      });
      router.replace("/agent");
    };
    window.addEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
    return () =>
      window.removeEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
  }, [router, setSelectedProjectId, setSelectedWorkspaceId]);

  const requiresWorkspace = useWorkspaceDataStore((store) => store.requiresWorkspace);
  return { data, error, loading, refresh, requiresWorkspace };
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
  source.addEventListener("workspace.member_role_changed", handleWorkspaceRealtimeChange);
  source.addEventListener("workspace.member_removed", handleWorkspaceRealtimeChange);
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
  if (change.kind === "member_role_changed") {
    updateRealtimeMemberRole(change);
    return;
  }
  if (change.kind === "member_removed") {
    const current = useWorkspaceDataStore.getState().data;
    if (current?.currentMember.id === change.memberId) {
      window.dispatchEvent(
        new CustomEvent<WorkspaceRealtimeChange>(workspaceMembershipRemovedEvent, {
          detail: change,
        }),
      );
      return;
    }
    updateWorkspaceData((data) => applyWorkspaceMemberRealtimeChange(data, change));
    return;
  }
  if (change.projectId !== null && change.taskId !== null) {
    void refreshRealtimeTask(change);
  }
  if (realtimeRefreshTimer !== null) clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(() => {
    realtimeRefreshTimer = null;
    notifyWorkspaceDataChanged();
  }, 250);
}

function updateRealtimeMemberRole(change: WorkspaceRealtimeChange): void {
  updateWorkspaceData((data) => applyWorkspaceMemberRealtimeChange(data, change));
}

function isCurrentMembershipRemoval(value: unknown): value is WorkspaceRealtimeChange & {
  kind: "member_removed";
  memberId: string;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "member_removed" &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "memberId" in value &&
    typeof value.memberId === "string"
  );
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
