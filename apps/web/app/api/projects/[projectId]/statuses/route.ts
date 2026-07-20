import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { isCreateProjectStatusInput } from "../../../../../lib/project-status-input";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const body: unknown = await request.json();
  if (workspaceId === null || !isCreateProjectStatusInput(body))
    return NextResponse.json({ error: "Invalid project status payload." }, { status: 400 });
  const { projectId } = await context.params;
  try {
    const api = createTaskApiClient({
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    });
    return NextResponse.json(await api.createWorkspaceStatus({ workspaceId, projectId, body }), {
      status: 201,
    });
  } catch (error: unknown) {
    return projectStatusError(error, "Unable to create project status.");
  }
}

function projectStatusError(error: unknown, fallback: string): NextResponse {
  const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
  const message = error instanceof TaskApiClientError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}
