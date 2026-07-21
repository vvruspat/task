import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../../../lib/auth";
import { isReorderProjectStatusesInput } from "../../../../../../lib/project-status-input";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  const body: unknown = await request.json().catch((): null => null);
  if (workspaceId === null || !isReorderProjectStatusesInput(body)) {
    return NextResponse.json({ error: "Invalid project status order." }, { status: 400 });
  }
  const { projectId } = await context.params;
  try {
    const api = createTaskApiClient({
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    });
    return NextResponse.json(await api.reorderWorkspaceStatuses({ workspaceId, projectId, body }));
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to reorder statuses.";
    return NextResponse.json({ error: message }, { status });
  }
}
