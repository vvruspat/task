import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { isUpdateSavedViewInput } from "../../../../lib/saved-view-input";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";
const trustedUserId = process.env["TASK_USER_ID"];
type RouteContext = { params: Promise<{ viewId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const body: unknown = await request.json();
  if (!isUpdateSavedViewInput(body))
    return NextResponse.json({ error: "Invalid saved view payload." }, { status: 400 });
  return mutate("PATCH", body, request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  return mutate("DELETE", null, request, context);
}

async function mutate(
  method: "PATCH" | "DELETE",
  body: Parameters<ReturnType<typeof createTaskApiClient>["updateSavedView"]>[0]["body"] | null,
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const { viewId } = await context.params;
  try {
    const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    const workspaces = await api.listWorkspaces();
    const workspace =
      workspaceId === null ? workspaces.at(0) : workspaces.find((item) => item.id === workspaceId);
    if (workspace === undefined)
      return NextResponse.json({ error: "No workspace is visible." }, { status: 404 });
    const view =
      method === "DELETE"
        ? await api.deleteSavedView({ workspaceId: workspace.id, viewId })
        : await api.updateSavedView({ workspaceId: workspace.id, viewId, body: body ?? {} });
    return NextResponse.json(view);
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update saved view.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
