"use client";

import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import { produce } from "immer";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { LatestRequestCoordinator } from "./latest-request";
import { ReconciliationScheduler } from "./reconciliation-scheduler";
import type {
  ApiFailure,
  WorkspaceBootstrap,
  WorkspaceProjectReconciliation,
  WorkspaceRequired,
} from "./workspace-contracts";
import { isApiFailure, isWorkspaceRequired } from "./workspace-contracts";
import {
  applyWorkspaceMemberRealtimeChange,
  createWorkspaceRealtimeConnectionLifecycle,
  findFallbackWorkspaceId,
  markWorkspaceRealtimeConnected,
  markWorkspaceRealtimeInterrupted,
  parseWorkspaceRealtimeChange,
  type WorkspaceRealtimeChange,
  type WorkspaceRealtimeConnectionLifecycle,
  type WorkspaceRealtimeConnectionStatus,
} from "./workspace-realtime";
import { useWorkspaceStore } from "./workspace-store";
import {
  applyWorkspaceProjectReconciliation,
  applyWorkspaceTaskUpdate,
  workspaceTaskUpdateRequiresProjectReconciliation,
} from "./workspace-task-cache";

type WorkspaceDataState = {
  data: WorkspaceBootstrap | null;
  error: string | null;
  loading: boolean;
  requiresWorkspace: boolean;
};

type WorkspaceDataStore = WorkspaceDataState & {
  connectionStatus: WorkspaceRealtimeConnectionStatus;
  replace: (state: WorkspaceDataState) => void;
  setConnectionStatus: (status: WorkspaceRealtimeConnectionStatus) => void;
  update: (updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap) => void;
};

type RealtimeConnection = {
  lifecycle: WorkspaceRealtimeConnectionLifecycle;
  references: number;
  source: EventSource;
};

const workspaceRefreshEvent = "task:workspace-data-refresh";
const workspaceMembershipRemovedEvent = "task:workspace-membership-removed";
export const workspaceRealtimeEvent = "task:workspace-realtime-event";
const workspaceRequestCoordinator = new LatestRequestCoordinator<
  string | null,
  WorkspaceBootstrap | WorkspaceRequired
>();
const realtimeConnections = new Map<string, RealtimeConnection>();
const pendingRealtimeProjects = new Map<string, string>();
const projectReconciliationGenerations = new Map<string, number>();
const taskRequestGenerations = new Map<string, number>();
let workspaceRealtimeRevision = 0;
const reconciliationClock = {
  clearTimer: (timer: ReturnType<typeof setTimeout>): void => clearTimeout(timer),
  now: (): number => Date.now(),
  setTimer: (callback: () => void, delayMs: number): ReturnType<typeof setTimeout> =>
    setTimeout(callback, delayMs),
};
const fullRealtimeReconciliationScheduler = new ReconciliationScheduler({
  clock: reconciliationClock,
  delayMs: 1_000,
  maxWaitMs: 5_000,
  run: reconcileFullWorkspace,
});
const projectRealtimeReconciliationScheduler = new ReconciliationScheduler({
  clock: reconciliationClock,
  delayMs: 250,
  maxWaitMs: 1_000,
  run: () => void reconcilePendingProjects(),
});

function reconcileFullWorkspace(): void {
  pendingRealtimeProjects.clear();
  projectRealtimeReconciliationScheduler.cancel();
  notifyWorkspaceDataChanged();
}

function scheduleFullWorkspaceReconciliation(): void {
  pendingRealtimeProjects.clear();
  projectRealtimeReconciliationScheduler.cancel();
  fullRealtimeReconciliationScheduler.schedule();
}

function scheduleProjectReconciliation(workspaceId: string, projectId: string): void {
  pendingRealtimeProjects.set(projectId, workspaceId);
  projectRealtimeReconciliationScheduler.schedule();
}

async function reconcilePendingProjects(): Promise<void> {
  const projects = [...pendingRealtimeProjects.entries()];
  pendingRealtimeProjects.clear();
  const results = await Promise.all(
    projects.map(([projectId, workspaceId]) => refreshRealtimeProject(workspaceId, projectId)),
  );
  if (results.some((result) => !result)) scheduleFullWorkspaceReconciliation();
}

const useWorkspaceDataStore = create<WorkspaceDataStore>()((set) => ({
  data: null,
  error: null,
  loading: true,
  requiresWorkspace: false,
  connectionStatus: "idle",
  replace: (state): void => set(state),
  setConnectionStatus: (connectionStatus): void => set({ connectionStatus }),
  update: (updater): void =>
    set((state) => (state.data === null ? state : { ...state, data: updater(state.data) })),
}));

export function notifyWorkspaceDataChanged(): void {
  window.dispatchEvent(new Event(workspaceRefreshEvent));
}

export function resetWorkspaceData(): void {
  workspaceRequestCoordinator.cancel();
  pendingRealtimeProjects.clear();
  projectReconciliationGenerations.clear();
  taskRequestGenerations.clear();
  workspaceRealtimeRevision = 0;
  fullRealtimeReconciliationScheduler.cancel();
  projectRealtimeReconciliationScheduler.cancel();
  const store = useWorkspaceDataStore.getState();
  store.replace({
    data: null,
    error: null,
    loading: true,
    requiresWorkspace: false,
  });
  store.setConnectionStatus("idle");
}

export function updateWorkspaceData(
  updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap,
): void {
  useWorkspaceDataStore.getState().update(updater);
}

export function updateWorkspaceTask(task: TaskSummary): void {
  updateWorkspaceData((data) => applyWorkspaceTaskUpdate(data, task));
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
  connectionStatus: WorkspaceRealtimeConnectionStatus;
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
      const requestRevision = workspaceRealtimeRevision;
      try {
        const result = await request.promise;
        if (!workspaceRequestCoordinator.isLatest(request)) return;
        if (requestRevision !== workspaceRealtimeRevision) {
          scheduleFullWorkspaceReconciliation();
          return;
        }
        if (isWorkspaceRequired(result)) {
          setSelectedWorkspaceId(null);
          const store = useWorkspaceDataStore.getState();
          store.replace({
            data: null,
            error: null,
            loading: false,
            requiresWorkspace: true,
          });
          store.setConnectionStatus("idle");
          return;
        }
        setSelectedWorkspaceId(result.workspace.id);
        const latest = useWorkspaceDataStore.getState();
        if (latest.data !== result || latest.error !== null || latest.loading) {
          latest.replace({ data: result, error: null, loading: false, requiresWorkspace: false });
        }
        latest.setConnectionStatus(
          realtimeConnections.get(result.workspace.id)?.lifecycle.status ?? "connecting",
        );
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
      useWorkspaceDataStore
        .getState()
        .setConnectionStatus(fallbackWorkspaceId === null ? "idle" : "connecting");
      router.replace("/agent");
    };
    window.addEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
    return () =>
      window.removeEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
  }, [router, setSelectedProjectId, setSelectedWorkspaceId]);

  const requiresWorkspace = useWorkspaceDataStore((store) => store.requiresWorkspace);
  const connectionStatus = useWorkspaceDataStore((store) => store.connectionStatus);
  return { connectionStatus, data, error, loading, refresh, requiresWorkspace };
}

function retainRealtimeConnection(workspaceId: string): () => void {
  const existing = realtimeConnections.get(workspaceId);
  if (existing !== undefined) {
    existing.references += 1;
    setActiveRealtimeConnectionStatus(workspaceId, existing.lifecycle.status);
    return () => releaseRealtimeConnection(workspaceId);
  }
  const source = new EventSource(
    `/api/workspace/events?workspaceId=${encodeURIComponent(workspaceId)}`,
  );
  const connection: RealtimeConnection = {
    lifecycle: createWorkspaceRealtimeConnectionLifecycle(),
    references: 1,
    source,
  };
  source.addEventListener("open", () => {
    const transition = markWorkspaceRealtimeConnected(connection.lifecycle);
    connection.lifecycle = transition.lifecycle;
    setActiveRealtimeConnectionStatus(workspaceId, transition.lifecycle.status);
    if (transition.reconnected) reconcileFullWorkspace();
  });
  source.addEventListener("error", () => {
    connection.lifecycle = markWorkspaceRealtimeInterrupted(connection.lifecycle, navigator.onLine);
    setActiveRealtimeConnectionStatus(workspaceId, connection.lifecycle.status);
  });
  source.addEventListener("workspace.changed", handleWorkspaceRealtimeChange);
  source.addEventListener("workspace.member_role_changed", handleWorkspaceRealtimeChange);
  source.addEventListener("workspace.member_removed", handleWorkspaceRealtimeChange);
  realtimeConnections.set(workspaceId, connection);
  setActiveRealtimeConnectionStatus(workspaceId, connection.lifecycle.status);
  return () => releaseRealtimeConnection(workspaceId);
}

function setActiveRealtimeConnectionStatus(
  workspaceId: string,
  status: WorkspaceRealtimeConnectionStatus,
): void {
  const store = useWorkspaceDataStore.getState();
  if (store.data?.workspace.id === workspaceId) store.setConnectionStatus(status);
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
  workspaceRealtimeRevision += 1;
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
  if (change.mutationKind === "updated" && change.projectId !== null && change.taskId !== null) {
    invalidateProjectReconciliation(change.projectId);
    const taskGeneration = invalidateTaskRequest(change.taskId);
    void refreshRealtimeTask(change, taskGeneration).then((updated) => {
      if (!updated) scheduleFullWorkspaceReconciliation();
    });
    return;
  }
  if (
    (change.mutationKind === "created" || change.mutationKind === "deleted") &&
    change.projectId !== null &&
    change.taskId !== null
  ) {
    invalidateProjectReconciliation(change.projectId);
    scheduleProjectReconciliation(change.workspaceId, change.projectId);
    return;
  }
  scheduleFullWorkspaceReconciliation();
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

async function refreshRealtimeTask(
  change: WorkspaceRealtimeChange,
  requestGeneration: number,
): Promise<boolean> {
  if (change.projectId === null || change.taskId === null) return false;
  if (useWorkspaceDataStore.getState().data?.workspace.id !== change.workspaceId) return true;
  const query = new URLSearchParams({
    projectId: change.projectId,
    workspaceId: change.workspaceId,
  });
  try {
    const response = await fetch(`/api/workspace/tasks/${change.taskId}?${query}`, {
      cache: "no-store",
    });
    const value: unknown = await response.json();
    if (taskRequestGenerations.get(change.taskId) !== requestGeneration) return true;
    if (!response.ok || !isTaskSummaryValue(value)) return false;
    if (useWorkspaceDataStore.getState().data?.workspace.id !== change.workspaceId) return true;
    taskRequestGenerations.delete(change.taskId);
    const current = useWorkspaceDataStore.getState().data;
    if (current !== null && workspaceTaskUpdateRequiresProjectReconciliation(current, value)) {
      scheduleProjectReconciliation(change.workspaceId, change.projectId);
    }
    updateWorkspaceTask(value);
    return true;
  } catch {
    return taskRequestGenerations.get(change.taskId) !== requestGeneration;
  }
}

async function refreshRealtimeProject(workspaceId: string, projectId: string): Promise<boolean> {
  const current = useWorkspaceDataStore.getState().data;
  if (current === null || current.workspace.id !== workspaceId) return true;
  const requestGeneration = projectReconciliationGenerations.get(projectId) ?? 0;
  const query = new URLSearchParams({ workspaceId });
  try {
    const response = await fetch(`/api/workspace/projects/${projectId}?${query}`, {
      cache: "no-store",
    });
    const value: unknown = await response.json();
    if (!response.ok || !isWorkspaceProjectReconciliation(value) || value.projectId !== projectId) {
      return false;
    }
    if ((projectReconciliationGenerations.get(projectId) ?? 0) !== requestGeneration) return true;
    if (useWorkspaceDataStore.getState().data?.workspace.id !== workspaceId) return true;
    updateWorkspaceData((data) => applyWorkspaceProjectReconciliation(data, value));
    return true;
  } catch {
    return false;
  }
}

function invalidateProjectReconciliation(projectId: string): void {
  projectReconciliationGenerations.set(
    projectId,
    (projectReconciliationGenerations.get(projectId) ?? 0) + 1,
  );
}

function invalidateTaskRequest(taskId: string): number {
  const generation = (taskRequestGenerations.get(taskId) ?? 0) + 1;
  taskRequestGenerations.set(taskId, generation);
  return generation;
}

function isWorkspaceProjectReconciliation(value: unknown): value is WorkspaceProjectReconciliation {
  return (
    typeof value === "object" &&
    value !== null &&
    "projectId" in value &&
    typeof value.projectId === "string" &&
    "tasks" in value &&
    Array.isArray(value.tasks) &&
    "table" in value &&
    typeof value.table === "object" &&
    value.table !== null &&
    "matrix" in value &&
    typeof value.matrix === "object" &&
    value.matrix !== null &&
    "myTasks" in value &&
    typeof value.myTasks === "object" &&
    value.myTasks !== null
  );
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
