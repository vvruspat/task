import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  if (query.length === 0) return NextResponse.json({ items: [], page: 1, pageSize: 20, total: 0 });
  const api = createTaskApiClient({
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    const workspace = (await api.listWorkspaces()).at(0);
    if (workspace === undefined)
      return NextResponse.json({ error: "No visible workspace." }, { status: 404 });
    return NextResponse.json(
      await api.search({ workspaceId: workspace.id, query, page: 1, pageSize: 20 }),
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof TaskApiClientError ? error.message : "Unable to search." },
      { status: 502 },
    );
  }
}
