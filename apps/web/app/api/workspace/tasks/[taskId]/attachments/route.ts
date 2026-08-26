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

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const { taskId } = await context.params;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId")?.trim();
  const workspaceId = url.searchParams.get("workspaceId")?.trim();
  const fileName = request.headers.get("x-task-file-name")?.trim();
  const mimeType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (
    taskId.trim().length === 0 ||
    projectId === undefined ||
    projectId.length === 0 ||
    workspaceId === undefined ||
    workspaceId.length === 0 ||
    fileName === undefined ||
    fileName.length === 0 ||
    mimeType === undefined ||
    mimeType.length === 0
  ) {
    return NextResponse.json(
      { error: "workspaceId, projectId, taskId, file name, and MIME type are required." },
      { status: 400 },
    );
  }
  const decodedFileName = decodeFileName(fileName);
  if (decodedFileName === null) {
    return NextResponse.json({ error: "Task file name is invalid." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: "Task file must not be empty." }, { status: 400 });
    }
    return NextResponse.json(
      await result.api.uploadTaskFile({
        bytes,
        fileName: decodedFileName,
        mimeType,
        projectId,
        taskId,
        workspaceId,
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to upload task file.");
  }
}

function decodeFileName(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
