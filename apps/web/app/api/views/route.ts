import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { isCreateSavedViewInput } from "../../../lib/saved-view-input";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";
const trustedUserId = process.env["TASK_USER_ID"];

export async function POST(request: Request): Promise<NextResponse> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const body: unknown = await request.json();
  if (!isCreateSavedViewInput(body))
    return NextResponse.json({ error: "Invalid saved view payload." }, { status: 400 });
  try {
    const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
    const workspaces = await api.listWorkspaces();
    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    const workspace =
      workspaceId === null ? workspaces.at(0) : workspaces.find((item) => item.id === workspaceId);
    if (workspace === undefined)
      return NextResponse.json({ error: "No workspace is visible." }, { status: 404 });
    return NextResponse.json(await api.createSavedView({ workspaceId: workspace.id, body }), {
      status: 201,
    });
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to create saved view.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
