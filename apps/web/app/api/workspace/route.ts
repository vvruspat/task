import type { ProjectSummary, SavedView, WorkspaceDetail, WorkspaceStatus } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../lib/auth";
import { isUnprojectedIssueProject } from "../../../lib/system-project";
import { mapWithConcurrency, type WorkspaceBootstrapScope } from "../../../lib/workspace-bootstrap";
import type {
  ApiFailure,
  ProjectData,
  WorkspaceBootstrap,
  WorkspaceRequired,
} from "../../../lib/workspace-contracts";
import { findCurrentWorkspaceMember } from "../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";
const projectLoadConcurrency = 4;
type WorkspaceApiClient = ReturnType<typeof createTaskApiClient>;
type LoadedProjectData = { projectData: ProjectData; statuses: WorkspaceStatus[] };

export async function GET(
  request: Request,
): Promise<NextResponse<WorkspaceBootstrap | WorkspaceRequired | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const scope = readWorkspaceBootstrapScope(url.searchParams.get("scope"));
    if (scope === null) {
      return NextResponse.json({ error: "Invalid workspace payload scope." }, { status: 400 });
    }
    const tasksParameter = url.searchParams.get("tasks");
    if (tasksParameter !== null && tasksParameter !== "1") {
      return NextResponse.json({ error: "Invalid workspace tasks option." }, { status: 400 });
    }
    const skillsParameter = url.searchParams.get("skills");
    if (skillsParameter !== null && skillsParameter !== "1") {
      return NextResponse.json({ error: "Invalid workspace skills option." }, { status: 400 });
    }
    const includeProjectTasks = scope === "view" || tasksParameter === "1";
    const includeTaskSkills = scope === "templates" || scope === "view" || skillsParameter === "1";
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) {
      return NextResponse.json({ requiresWorkspace: true });
    }
    const selector = url.searchParams.get("workspace");
    const workspace =
      selector === null
        ? workspaces.at(0)
        : workspaces.find((candidate) => candidate.id === selector || candidate.slug === selector);
    if (workspace === undefined)
      return NextResponse.json(
        { error: "No workspace is visible for the configured user." },
        { status: 404 },
      );
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
    const scopedProjects = selectScopedProjects(
      scope,
      url.searchParams.get("project"),
      url.searchParams.get("view"),
      allProjects,
      views,
    );
    if (scope === "project" && scopedProjects.length === 0) {
      return NextResponse.json({ error: "The requested project is not visible." }, { status: 404 });
    }
    const [loadedProjects, taskSkills] = await Promise.all([
      mapWithConcurrency(scopedProjects, projectLoadConcurrency, (project) =>
        loadProjectData(api, workspaceId, project, includeProjectTasks),
      ),
      includeTaskSkills ? api.listTaskSkills({ workspaceId }) : Promise.resolve([]),
    ]);
    const projectData = loadedProjects.map((loaded) => loaded.projectData);
    const statuses = loadedProjects.flatMap((loaded) => loaded.statuses);
    const currentMember = findCurrentWorkspaceMember(detail, trustedUserId);
    if (currentMember === null) {
      return NextResponse.json(
        { error: "Current workspace membership was not found." },
        { status: 403 },
      );
    }
    const payload: WorkspaceBootstrap = {
      availableWorkspaces: workspaces,
      currentMember,
      workspace: detail,
      myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
      projects,
      statuses,
      taskSkills,
      confirmations: [],
      agentRuns: [],
      views,
      projectData,
    };
    return measuredWorkspaceResponse(payload, scope, startedAt);
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to load workspace data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

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
  scope: WorkspaceBootstrapScope,
  projectSelector: string | null,
  viewSelector: string | null,
  projects: readonly ProjectSummary[],
  views: readonly SavedView[],
): ProjectSummary[] {
  if (scope === "project") {
    const project = projects.find(
      (item) =>
        item.id === projectSelector ||
        item.slug === projectSelector ||
        item.key === projectSelector,
    );
    return project === undefined ? [] : [project];
  }
  if (scope !== "view") return [];
  const selectedView =
    views.find((view) => view.id === viewSelector || view.slug === viewSelector) ?? views.at(0);
  if (selectedView === undefined) return [];
  return selectedView.projectId === null || selectedView.projectId === undefined
    ? [...projects]
    : projects.filter((project) => project.id === selectedView.projectId);
}

function readWorkspaceBootstrapScope(value: string | null): WorkspaceBootstrapScope | null {
  if (value === null) return "shell";
  return value === "shell" || value === "project" || value === "templates" || value === "view"
    ? value
    : null;
}

function measuredWorkspaceResponse(
  payload: WorkspaceBootstrap,
  scope: WorkspaceBootstrapScope,
  startedAt: number,
): NextResponse<WorkspaceBootstrap> {
  const response = NextResponse.json(payload);
  const durationMs = Math.max(0, performance.now() - startedAt);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  response.headers.set("server-timing", `workspace-bootstrap;dur=${durationMs.toFixed(1)}`);
  response.headers.set("x-workspace-bootstrap-scope", scope);
  response.headers.set("x-workspace-payload-bytes", String(payloadBytes));
  return response;
}

export async function POST(request: Request): Promise<NextResponse<WorkspaceDetail | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const input = await request.json().catch((): null => null);
  if (!isWorkspaceCreate(input)) {
    return NextResponse.json({ error: "Введите название рабочего пространства." }, { status: 400 });
  }
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(await api.createWorkspace({ body: { name: input.name.trim() } }), {
      status: 201,
    });
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Не удалось создать workspace.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse<WorkspaceDetail | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const input = await request.json().catch((): null => null);
  if (!isWorkspaceUpdate(input)) {
    return NextResponse.json(
      { error: "workspaceId and at least one editable field are required." },
      { status: 400 },
    );
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(
      await api.updateWorkspace({
        body: {
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.description === undefined ? {} : { description: input.description }),
        },
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update workspace.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
  }

  const input = await request.json().catch((): null => null);
  if (!isWorkspaceDelete(input)) {
    return NextResponse.json({ error: "Не указан workspace для удаления." }, { status: 400 });
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(await api.deleteWorkspace({ workspaceId: input.workspaceId }));
  } catch (error: unknown) {
    if (error instanceof TaskApiClientError) {
      const status = error.status === 403 || error.status === 404 ? error.status : 502;
      const message =
        status === 403
          ? "Удалить workspace может только его владелец."
          : status === 404
            ? "Workspace уже удалён или не найден."
            : "Не удалось удалить workspace.";
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: "Не удалось удалить workspace." }, { status: 502 });
  }
}

function isWorkspaceCreate(value: unknown): value is { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 80
  );
}

function isWorkspaceDelete(value: unknown): value is { workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.trim().length > 0
  );
}

function isWorkspaceUpdate(
  value: unknown,
): value is { description?: string | null; name?: string; workspaceId: string } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("workspaceId" in value) ||
    typeof value.workspaceId !== "string"
  )
    return false;
  const hasName = "name" in value;
  const hasDescription = "description" in value;
  return (
    (hasName || hasDescription) &&
    (!hasName ||
      (typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        value.name.trim().length <= 80)) &&
    (!hasDescription || value.description === null || typeof value.description === "string")
  );
}

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}
