import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import type { ApiFailure, ProjectData, WorkspaceBootstrap } from "../../../lib/workspace-contracts";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";
const trustedUserId = process.env["TASK_USER_ID"];

export async function GET(): Promise<NextResponse<WorkspaceBootstrap | ApiFailure>> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json(
      { error: "Set TASK_USER_ID to a valid backend user id before using the web app." },
      { status: 503 },
    );
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    const workspaces = await api.listWorkspaces();
    const workspace = workspaces.at(0);
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
      projects,
      statuses,
      taskSkills,
      confirmations,
      agentRuns,
      views,
    ] = await Promise.all([
      api.getWorkspace({ workspaceId }),
      api.getDashboardOverview({ workspaceId }),
      api.listMyTasks({ workspaceId }),
      api.listProjects({ workspaceId }),
      api.listStatuses({ workspaceId }),
      api.listTaskSkills({ workspaceId }),
      api.listPendingConfirmationRequests({ workspaceId }),
      api.listAgentRuns({ workspaceId }),
      api.listSavedViews({ workspaceId }),
    ]);
    const projectData = await Promise.all(
      projects.map(
        async (project): Promise<ProjectData> => ({
          projectId: project.id,
          tasks: await api.listTasks({ workspaceId, projectId: project.id }),
          table: await api.listTaskTable({ workspaceId, projectId: project.id }),
          matrix: await api.getProjectMatrix({ workspaceId, projectId: project.id }),
        }),
      ),
    );
    return NextResponse.json({
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
