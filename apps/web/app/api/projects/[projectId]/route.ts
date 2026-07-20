import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null || workspaceId.trim().length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const { projectId } = await context.params;
  try {
    const api = createTaskApiClient({
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    });
    return NextResponse.json(await api.deleteProject({ workspaceId, projectId }));
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to delete project.";
    return NextResponse.json({ error: message }, { status });
  }
}
