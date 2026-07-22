import type { WorkspaceDetail } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../lib/auth";
import { isUnprojectedIssueProject } from "../../../lib/system-project";
import type {
  ApiFailure,
  ProjectData,
  WorkspaceBootstrap,
  WorkspaceRequired,
} from "../../../lib/workspace-contracts";
import { findCurrentWorkspaceMember } from "../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";

export async function GET(
  request: Request,
): Promise<NextResponse<WorkspaceBootstrap | WorkspaceRequired | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    const workspaces = await api.listWorkspaces();
    if (workspaces.length === 0) {
      return NextResponse.json({ requiresWorkspace: true });
    }
    const selector = new URL(request.url).searchParams.get("workspace");
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
    const [detail, myTasks, allProjects, taskSkills, confirmations, agentRuns, allViews] =
      await Promise.all([
        api.getWorkspace({ workspaceId }),
        api.listMyTasks({ workspaceId }),
        api.listProjects({ workspaceId }),
        api.listTaskSkills({ workspaceId }),
        api.listPendingConfirmationRequests({ workspaceId }),
        api.listAgentRuns({ workspaceId }),
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
    const projectData = await Promise.all(
      allProjects.map(
        async (project): Promise<ProjectData> => ({
          projectId: project.id,
          projectKey: project.key,
          projectTitle: isUnprojectedIssueProject(project) ? "Без проекта" : project.title,
          projectless: isUnprojectedIssueProject(project),
          tasks: await api.listTasks({ workspaceId, projectId: project.id }),
          table: await api.listTaskTable({ workspaceId, projectId: project.id }),
          matrix: await api.getProjectMatrix({ workspaceId, projectId: project.id }),
        }),
      ),
    );
    const statuses = (
      await Promise.all(
        allProjects.map((project) => api.listStatuses({ workspaceId, projectId: project.id })),
      )
    ).flat();
    const currentMember = findCurrentWorkspaceMember(detail, trustedUserId);
    if (currentMember === null) {
      return NextResponse.json(
        { error: "Current workspace membership was not found." },
        { status: 403 },
      );
    }
    return NextResponse.json({
      availableWorkspaces: workspaces,
      currentMember,
      workspace: detail,
      myTasks,
      projects,
      statuses,
      taskSkills,
      confirmations,
      agentRuns,
      views,
      projectData,
    });
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to load workspace data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
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
