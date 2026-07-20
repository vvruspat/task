import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ identifier: string }> },
): Promise<NextResponse> {
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  }

  const { identifier } = await context.params;
  const api = createTaskApiClient({
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });

  try {
    const workspaceSelector = new URL(request.url).searchParams.get("workspace");
    const workspaces = await api.listWorkspaces();
    const workspace =
      workspaceSelector === null
        ? workspaces.at(0)
        : workspaces.find(
            (item) => item.id === workspaceSelector || item.slug === workspaceSelector,
          );
    if (workspace === undefined) {
      return NextResponse.json({ error: "No workspace is visible." }, { status: 404 });
    }
    return NextResponse.json(await api.getIssue({ workspaceId: workspace.id, identifier }));
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to load the issue.";
    return NextResponse.json({ error: message }, { status });
  }
}
