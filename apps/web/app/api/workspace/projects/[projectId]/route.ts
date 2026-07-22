import { createTaskApiClient, type ProjectDetail, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../../lib/auth";
import type {
  ApiFailure,
  WorkspaceProjectReconciliation,
} from "../../../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<NextResponse<WorkspaceProjectReconciliation | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }

  const { projectId } = await context.params;
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    const [tasks, table, matrix, myTasks] = await Promise.all([
      api.listTasks({ workspaceId, projectId }),
      api.listTaskTable({ workspaceId, projectId }),
      api.getProjectMatrix({ workspaceId, projectId }),
      api.listMyTasks({ workspaceId }),
    ]);
    return NextResponse.json({ matrix, myTasks, projectId, table, tasks });
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to reconcile project data.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<NextResponse<ProjectDetail | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const input = await request.json().catch((): null => null);
  if (!isProjectDescriptionUpdate(input)) {
    return NextResponse.json(
      { error: "workspaceId and description are required." },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(
      await api.updateProject({
        body: { description: input.description },
        projectId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update project.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function isProjectDescriptionUpdate(
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

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}
