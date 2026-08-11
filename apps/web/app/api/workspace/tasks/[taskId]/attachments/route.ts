import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const { taskId } = await context.params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const workspaceId = url.searchParams.get("workspaceId")?.trim();
  if (
    taskId.trim().length === 0 ||
    projectId === undefined ||
    projectId.length === 0 ||
    workspaceId === undefined ||
    workspaceId.length === 0
  ) {
    return NextResponse.json(
      { error: "workspaceId, projectId, and taskId are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.listTaskAttachments({ projectId, taskId, workspaceId }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load task files.");
  }
}
