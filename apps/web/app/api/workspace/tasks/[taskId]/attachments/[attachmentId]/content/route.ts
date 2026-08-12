import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../../../../../lib/auth";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string; taskId: string }> },
): Promise<Response> {
  const userId = readAuthenticatedUserId(request);
  if (userId === undefined) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const { attachmentId, taskId } = await context.params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const workspaceId = url.searchParams.get("workspaceId")?.trim();
  if (
    attachmentId.trim().length === 0 ||
    taskId.trim().length === 0 ||
    projectId === undefined ||
    projectId.length === 0 ||
    workspaceId === undefined ||
    workspaceId.length === 0
  ) {
    return NextResponse.json(
      { error: "workspaceId, projectId, taskId, and attachmentId are required." },
      { status: 400 },
    );
  }
  try {
    const response = await fetch(
      `${apiBaseUrl}/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}/content`,
      { cache: "no-store", headers: { "x-task-user-id": userId } },
    );
    const headers = new Headers();
    for (const name of [
      "cache-control",
      "content-disposition",
      "content-length",
      "content-type",
      "x-content-type-options",
    ]) {
      const value = response.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    return new Response(response.body, { headers, status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to download task file." }, { status: 502 });
  }
}
