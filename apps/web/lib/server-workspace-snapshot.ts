import { randomUUID } from "node:crypto";
import type { ProjectSummary, SavedView, WorkspaceStatus } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { headers } from "next/headers";
import { cache } from "react";
import { authenticatedUserIdHeader, workspaceRequestPathHeader } from "./auth";
import { isUnprojectedIssueProject } from "./system-project";
import {
  mapWithConcurrency,
  type WorkspaceBootstrapRequest,
  workspaceBootstrapRequestForRoute,
  workspaceBootstrapRequestKey,
} from "./workspace-bootstrap";
import type { ProjectData, WorkspaceBootstrap, WorkspaceRequired } from "./workspace-contracts";
import { findCurrentWorkspaceMember } from "./workspace-contracts";
import type { WorkspaceServerSnapshot } from "./workspace-server-snapshot";

const projectLoadConcurrency = 4;
type WorkspaceApiClient = ReturnType<typeof createTaskApiClient>;
type LoadedProjectData = Readonly<{ projectData: ProjectData; statuses: WorkspaceStatus[] }>;

export class WorkspaceSnapshotLoadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkspaceSnapshotLoadError";
    this.status = status;
  }
}

export async function loadWorkspaceSnapshotData(
  input: Readonly<{
    request: WorkspaceBootstrapRequest;
    trustedUserId: string;
    workspaceSelector: string | null;
  }>,
): Promise<WorkspaceBootstrap | WorkspaceRequired> {
  const api = createWorkspaceApi(input.trustedUserId);
  try {
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) return { requiresWorkspace: true };
    const workspace =
      input.workspaceSelector === null
        ? workspaces.at(0)
        : workspaces.find(
            (candidate) =>
              candidate.id === input.workspaceSelector ||
              candidate.slug === input.workspaceSelector,
          );
    if (workspace === undefined) {
      throw new WorkspaceSnapshotLoadError("No workspace is visible for the configured user.", 404);
    }
    const workspaceId = workspace.id;
    const [detail, allProjects, allViews] = await Promise.all([
      api.getWorkspace({ workspaceId }),
      api.listProjects({ workspaceId }),
      api.listSavedViews({ workspaceId }),
    ]);
    const projects = allProjects.filter((project) => !isUnprojectedIssueProject(project));
    const systemProjectIds = new Set(
      allProjects.filter(isUnprojectedIssueProject).map((project) => project.id),
    );
    const views = allViews.filter(
      (view) =>
        view.projectId === null ||
        view.projectId === undefined ||
        !systemProjectIds.has(view.projectId),
    );
    const scopedProjects = selectScopedProjects(input.request, allProjects, views);
    if (input.request.scope === "project" && scopedProjects.length === 0) {
      throw new WorkspaceSnapshotLoadError("The requested project is not visible.", 404);
    }
    const [loadedProjects, taskSkills] = await Promise.all([
      mapWithConcurrency(scopedProjects, projectLoadConcurrency, (project) =>
        loadProjectData(api, workspaceId, project, input.request.includeProjectTasks),
      ),
      input.request.includeTaskSkills ? api.listTaskSkills({ workspaceId }) : Promise.resolve([]),
    ]);
    const currentMember = findCurrentWorkspaceMember(detail, input.trustedUserId);
    if (currentMember === null) {
      throw new WorkspaceSnapshotLoadError("Current workspace membership was not found.", 403);
    }
    return {
      agentRuns: [],
      availableWorkspaces: workspaces,
      confirmations: [],
      currentMember,
      myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
      projectData: loadedProjects.map((loaded) => loaded.projectData),
      projects,
      statuses: loadedProjects.flatMap((loaded) => loaded.statuses),
      taskSkills,
      views,
      workspace: detail,
    };
  } catch (error: unknown) {
    if (error instanceof WorkspaceSnapshotLoadError) throw error;
    throw new WorkspaceSnapshotLoadError(
      error instanceof TaskApiClientError ? error.message : "Unable to load workspace data.",
      502,
    );
  }
}

export async function loadCurrentWorkspaceServerSnapshot(
  workspaceSelector: string | null,
): Promise<WorkspaceServerSnapshot> {
  const requestHeaders = await headers();
  const trustedUserId = requestHeaders.get(authenticatedUserIdHeader);
  if (trustedUserId === null || trustedUserId.trim().length === 0) {
    throw new WorkspaceSnapshotLoadError("Authentication is required.", 401);
  }
  const requestPath = requestHeaders.get(workspaceRequestPathHeader) ?? "/agent";
  const routeUrl = new URL(requestPath, "http://workspace.local");
  return loadCachedWorkspaceServerSnapshot(
    trustedUserId,
    workspaceSelector ?? "",
    routeUrl.pathname,
    routeUrl.searchParams.get("project") ?? "",
    routeUrl.searchParams.get("view") ?? "",
  );
}

export async function loadOptionalCurrentWorkspaceServerSnapshot(
  workspaceSelector: string | null,
): Promise<WorkspaceServerSnapshot | null> {
  try {
    return await loadCurrentWorkspaceServerSnapshot(workspaceSelector);
  } catch (error: unknown) {
    console.error("Server workspace snapshot failed; falling back to client reconciliation.", {
      error: error instanceof Error ? error.message : "Unknown server snapshot error.",
      status: error instanceof WorkspaceSnapshotLoadError ? error.status : 502,
      workspaceSelector,
    });
    return null;
  }
}

const loadCachedWorkspaceServerSnapshot = cache(
  async (
    trustedUserId: string,
    workspaceSelector: string,
    pathname: string,
    projectSelector: string,
    viewSelector: string,
  ): Promise<WorkspaceServerSnapshot> => {
    const request = workspaceBootstrapRequestForRoute(pathname, {
      project: projectSelector.length === 0 ? null : projectSelector,
      view: viewSelector.length === 0 ? null : viewSelector,
    });
    const resolvedWorkspaceSelector = workspaceSelector.length === 0 ? null : workspaceSelector;
    const body = await loadWorkspaceSnapshotData({
      request,
      trustedUserId,
      workspaceSelector: resolvedWorkspaceSelector,
    });
    return {
      body,
      capturedAt: Date.now(),
      id: randomUUID(),
      request,
      requestKey: workspaceBootstrapRequestKey(resolvedWorkspaceSelector, request),
    };
  },
);

async function loadProjectData(
  api: WorkspaceApiClient,
  workspaceId: string,
  project: ProjectSummary,
  includeTasks: boolean,
): Promise<LoadedProjectData> {
  const [tasks, statuses] = await Promise.all([
    includeTasks ? api.listTasks({ workspaceId, projectId: project.id }) : Promise.resolve([]),
    api.listStatuses({ workspaceId, projectId: project.id }),
  ]);
  return {
    projectData: {
      matrix: { cells: [], columns: [], stages: [] },
      projectId: project.id,
      projectKey: project.key,
      projectTitle: isUnprojectedIssueProject(project) ? "Без проекта" : project.title,
      projectless: isUnprojectedIssueProject(project),
      table: { items: [], page: 1, pageSize: 50, total: 0 },
      tasks,
    },
    statuses,
  };
}

function selectScopedProjects(
  request: WorkspaceBootstrapRequest,
  projects: readonly ProjectSummary[],
  views: readonly SavedView[],
): ProjectSummary[] {
  if (request.scope === "project") {
    const project = projects.find(
      (item) =>
        item.id === request.projectSelector ||
        item.slug === request.projectSelector ||
        item.key === request.projectSelector,
    );
    return project === undefined ? [] : [project];
  }
  if (request.scope !== "view") return [];
  const selectedView =
    views.find((view) => view.id === request.viewSelector || view.slug === request.viewSelector) ??
    views.at(0);
  if (selectedView === undefined) return [];
  return selectedView.projectId === null || selectedView.projectId === undefined
    ? [...projects]
    : projects.filter((project) => project.id === selectedView.projectId);
}

function createWorkspaceApi(trustedUserId: string): WorkspaceApiClient {
  return createTaskApiClient({
    baseUrl: readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000",
    fetch: noStoreFetch,
    trustedUserId,
  });
}

const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store" });

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}
