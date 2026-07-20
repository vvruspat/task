import type { WorkspaceDetail } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { isUnprojectedIssueProject } from "../../../lib/system-project";
import type { ApiFailure, ProjectData, WorkspaceBootstrap } from "../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";
const trustedUserId = readEnvironment("TASK_USER_ID");

export async function GET(
  request: Request,
): Promise<NextResponse<WorkspaceBootstrap | ApiFailure>> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json(
      { error: "Set TASK_USER_ID to a valid backend user id before using the web app." },
      { status: 503 },
    );
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    const workspaces = await api.listWorkspaces();
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
    const [
      detail,
      dashboard,
      myTasks,
      allProjects,
      taskSkills,
      confirmations,
      agentRuns,
      allViews,
    ] = await Promise.all([
      api.getWorkspace({ workspaceId }),
      api.getDashboardOverview({ workspaceId }),
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
    return NextResponse.json({
      availableWorkspaces: workspaces,
      workspace: detail,
      dashboard,
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

export async function PATCH(request: Request): Promise<NextResponse<WorkspaceDetail | ApiFailure>> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  }

  const input = await request.json().catch((): null => null);
  if (!isWorkspaceDescriptionUpdate(input)) {
    return NextResponse.json(
      { error: "workspaceId and description are required." },
      { status: 400 },
    );
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(
      await api.updateWorkspace({
        body: { description: input.description },
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update workspace.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function isWorkspaceDescriptionUpdate(
  value: unknown,
): value is { description: string | null; workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "description" in value &&
    (value.description === null || typeof value.description === "string")
  );
}

function readEnvironment(name: "TASK_API_BASE_URL" | "TASK_USER_ID"): string | undefined {
  return process.env[name];
}
