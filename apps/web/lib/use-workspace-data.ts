"use client";

import type { TaskSummary, WorkspaceStatus } from "@task/api-client";
import { produce } from "immer";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useMemo } from "react";
import { create } from "zustand";
import { LatestRequestCoordinator } from "./latest-request";
import { ReconciliationScheduler } from "./reconciliation-scheduler";
import {
  type WorkspaceBootstrapRequest,
  workspaceBootstrapRequestCovers,
  workspaceBootstrapRequestForRoute,
  workspaceBootstrapRequestKey,
} from "./workspace-bootstrap";
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
import { useWorkspaceSelectionStore } from "./workspace-selection-store";
import {
  resolveWorkspaceServerSnapshot,
  type WorkspaceServerSnapshot,
} from "./workspace-server-snapshot";
import { WorkspaceServerSnapshotContext } from "./workspace-server-snapshot-context";
import {
  applyWorkspaceProjectReconciliation,
  applyWorkspaceTaskUpdate,
  workspaceTaskUpdateRequiresProjectReconciliation,
} from "./workspace-task-cache";
import { workspacePageHref } from "./workspace-url";

type WorkspaceDataState = {
  data: WorkspaceBootstrap | null;
  error: string | null;
  loading: boolean;
  requiresWorkspace: boolean;
};

type WorkspaceDataResult = WorkspaceDataState & {
  connectionStatus: WorkspaceRealtimeConnectionStatus;
  refresh: () => Promise<void>;
};

type WorkspaceDataStore = WorkspaceDataState & {
  replace: (state: WorkspaceDataState) => void;
  update: (updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap) => void;
};

type WorkspaceConnectionStore = {
  status: WorkspaceRealtimeConnectionStatus;
  setStatus: (status: WorkspaceRealtimeConnectionStatus) => void;
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
  string,
  WorkspaceBootstrap | WorkspaceRequired
>();
let loadedWorkspaceRequestKey: string | null = null;
let loadedWorkspaceBootstrapRequest: WorkspaceBootstrapRequest | null = null;
let latestWorkspaceClientMutationAt = 0;
const appliedWorkspaceServerSnapshots = new Set<string>();
let activeWorkspaceRefresh: (() => Promise<void>) | null = null;
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
  replace: (state): void => set(state),
  update: (updater): void =>
    set((state) => (state.data === null ? state : { ...state, data: updater(state.data) })),
}));
const useWorkspaceConnectionStore = create<WorkspaceConnectionStore>()((set) => ({
  setStatus: (status): void => set({ status }),
  status: "idle",
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
  loadedWorkspaceRequestKey = null;
  loadedWorkspaceBootstrapRequest = null;
  latestWorkspaceClientMutationAt = 0;
  appliedWorkspaceServerSnapshots.clear();
  activeWorkspaceRefresh = null;
  fullRealtimeReconciliationScheduler.cancel();
  projectRealtimeReconciliationScheduler.cancel();
  const store = useWorkspaceDataStore.getState();
  store.replace({
    data: null,
    error: null,
    loading: true,
    requiresWorkspace: false,
  });
  useWorkspaceConnectionStore.getState().setStatus("idle");
}

export function updateWorkspaceData(
  updater: (data: WorkspaceBootstrap) => WorkspaceBootstrap,
): void {
  latestWorkspaceClientMutationAt = Date.now();
  useWorkspaceDataStore.getState().update(updater);
}

export function hydrateWorkspaceServerSnapshot(snapshot: WorkspaceServerSnapshot): void {
  if (appliedWorkspaceServerSnapshots.has(snapshot.id)) return;
  appliedWorkspaceServerSnapshots.add(snapshot.id);
  if (appliedWorkspaceServerSnapshots.size > 20) {
    const oldestSnapshotId = appliedWorkspaceServerSnapshots.values().next().value;
    if (oldestSnapshotId !== undefined) appliedWorkspaceServerSnapshots.delete(oldestSnapshotId);
  }
  workspaceRequestCoordinator.cancel();
  const store = useWorkspaceDataStore.getState();
  const resolved = resolveWorkspaceServerSnapshot(
    store.data,
    loadedWorkspaceBootstrapRequest,
    snapshot,
    latestWorkspaceClientMutationAt,
  );
  store.replace({
    data: resolved.data,
    error: null,
    loading: false,
    requiresWorkspace: resolved.requiresWorkspace,
  });
  loadedWorkspaceRequestKey = snapshot.requestKey;
  loadedWorkspaceBootstrapRequest = snapshot.request;
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
  bootstrapRequest: WorkspaceBootstrapRequest,
  signal: AbortSignal,
): Promise<WorkspaceBootstrap | WorkspaceRequired> {
  const parameters = new URLSearchParams({ scope: bootstrapRequest.scope });
  if (selector !== null) parameters.set("workspace", selector);
  if (bootstrapRequest.includeProjectTasks) parameters.set("tasks", "1");
  if (bootstrapRequest.includeTaskSkills) parameters.set("skills", "1");
  if (bootstrapRequest.projectSelector !== null) {
    parameters.set("project", bootstrapRequest.projectSelector);
  }
  if (bootstrapRequest.viewSelector !== null) parameters.set("view", bootstrapRequest.viewSelector);
  const result = await readJson(
    await fetch(`/api/workspace?${parameters.toString()}`, { cache: "no-store", signal }),
  );
  if (isApiFailure(result)) throw new Error(result.error);
  return result;
}

export function useWorkspaceDataController(): WorkspaceDataResult {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeWorkspaceSlug = pathname.match(/^\/w\/([^/]+)/)?.[1] ?? null;
  const selectedWorkspaceId = useWorkspaceSelectionStore((store) => store.selectedWorkspaceId);
  const setSelectedWorkspaceId = useWorkspaceSelectionStore(
    (store) => store.setSelectedWorkspaceId,
  );
  const setSelectedProjectId = useWorkspaceSelectionStore((store) => store.setSelectedProjectId);
  const state = useWorkspaceDataState();
  const data = state.data;
  const workspaceSelector = routeWorkspaceSlug ?? selectedWorkspaceId;
  const queryProject = searchParams.get("project");
  const queryView = searchParams.get("view");
  const bootstrapRequest = useMemo(
    () => workspaceBootstrapRequestForRoute(pathname, { project: queryProject, view: queryView }),
    [pathname, queryProject, queryView],
  );
  const requestKey = workspaceBootstrapRequestKey(workspaceSelector, bootstrapRequest);

  const load = useCallback(
    async (force: boolean): Promise<void> => {
      const current = useWorkspaceDataStore.getState();
      const matchesCurrentWorkspace =
        current.data !== null &&
        (workspaceSelector === null ||
          current.data.workspace.id === workspaceSelector ||
          current.data.workspace.slug === workspaceSelector);
      if (!force && matchesCurrentWorkspace) {
        if (loadedWorkspaceRequestKey === requestKey) return;
        if (
          current.data !== null &&
          workspaceBootstrapRequestCovers(
            loadedWorkspaceBootstrapRequest,
            bootstrapRequest,
            current.data,
          )
        ) {
          loadedWorkspaceRequestKey = requestKey;
          loadedWorkspaceBootstrapRequest = bootstrapRequest;
          return;
        }
      }

      // Existing content remains mounted during background synchronization.
      if (current.data === null) {
        current.replace({ data: null, error: null, loading: true, requiresWorkspace: false });
      }
      const request = workspaceRequestCoordinator.request(requestKey, (signal) =>
        requestWorkspace(workspaceSelector, bootstrapRequest, signal),
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
          useWorkspaceConnectionStore.getState().setStatus("idle");
          return;
        }
        setSelectedWorkspaceId(result.workspace.id);
        loadedWorkspaceRequestKey = requestKey;
        loadedWorkspaceBootstrapRequest = bootstrapRequest;
        const latest = useWorkspaceDataStore.getState();
        if (latest.data !== result || latest.error !== null || latest.loading) {
          latest.replace({ data: result, error: null, loading: false, requiresWorkspace: false });
        }
        useWorkspaceConnectionStore
          .getState()
          .setStatus(
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
    [bootstrapRequest, requestKey, setSelectedWorkspaceId, workspaceSelector],
  );

  const refresh = useCallback(async (): Promise<void> => load(true), [load]);
  useEffect(() => {
    activeWorkspaceRefresh = refresh;
    return () => {
      if (activeWorkspaceRefresh === refresh) activeWorkspaceRefresh = null;
    };
  }, [refresh]);
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
      const fallbackWorkspace = current.availableWorkspaces.find(
        (workspace) => workspace.id === fallbackWorkspaceId,
      );
      workspaceRequestCoordinator.cancel();
      setSelectedWorkspaceId(fallbackWorkspaceId);
      setSelectedProjectId(null);
      useWorkspaceDataStore.getState().replace({
        data: null,
        error: null,
        loading: fallbackWorkspaceId !== null,
        requiresWorkspace: fallbackWorkspaceId === null,
      });
      useWorkspaceConnectionStore
        .getState()
        .setStatus(fallbackWorkspaceId === null ? "idle" : "connecting");
      router.replace(
        fallbackWorkspace === undefined
          ? "/agent"
          : workspacePageHref(fallbackWorkspace.slug, "agent"),
      );
    };
    window.addEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
    return () =>
      window.removeEventListener(workspaceMembershipRemovedEvent, handleMembershipRemoved);
  }, [router, setSelectedProjectId, setSelectedWorkspaceId]);

  return { ...state, refresh };
}

export function useWorkspaceData(): WorkspaceDataResult {
  const state = useWorkspaceDataState();
  const refresh = useCallback(async (): Promise<void> => {
    await activeWorkspaceRefresh?.();
  }, []);
  return { ...state, refresh };
}

function useWorkspaceDataState(): WorkspaceDataState & {
  connectionStatus: WorkspaceRealtimeConnectionStatus;
} {
  const serverSnapshot = useContext(WorkspaceServerSnapshotContext);
  const storedData = useWorkspaceDataStore((store) => store.data);
  const storedError = useWorkspaceDataStore((store) => store.error);
  const storedLoading = useWorkspaceDataStore((store) => store.loading);
  const storedRequiresWorkspace = useWorkspaceDataStore((store) => store.requiresWorkspace);
  const connectionStatus = useWorkspaceConnectionStore((store) => store.status);
  const initialSnapshotState =
    serverSnapshot === null || appliedWorkspaceServerSnapshots.has(serverSnapshot.id)
      ? null
      : resolveWorkspaceServerSnapshot(
          storedData,
          loadedWorkspaceBootstrapRequest,
          serverSnapshot,
          latestWorkspaceClientMutationAt,
        );
  return {
    connectionStatus,
    data: initialSnapshotState?.data ?? storedData,
    error: initialSnapshotState === null ? storedError : null,
    loading: initialSnapshotState === null ? storedLoading : false,
    requiresWorkspace: initialSnapshotState?.requiresWorkspace ?? storedRequiresWorkspace,
  };
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
  if (store.data?.workspace.id === workspaceId) {
    useWorkspaceConnectionStore.getState().setStatus(status);
  }
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
  latestWorkspaceClientMutationAt = Date.now();
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
  if (
    change.projectId !== null &&
    change.taskId !== null &&
    !activePayloadIncludesProjectTasks(change.workspaceId, change.projectId)
  ) {
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

function activePayloadIncludesProjectTasks(workspaceId: string, projectId: string): boolean {
  const data = useWorkspaceDataStore.getState().data;
  return (
    data?.workspace.id === workspaceId &&
    loadedWorkspaceBootstrapRequest?.includeProjectTasks === true &&
    data.projectData.some((project) => project.projectId === projectId)
  );
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
