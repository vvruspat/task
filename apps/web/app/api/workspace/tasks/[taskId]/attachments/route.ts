import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

const maxUploadBytes = 25 * 1_024 * 1_024;

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
  const contentLength = readContentLength(request.headers.get("content-length"));
  if (
    taskId.trim().length === 0 ||
    projectId === undefined ||
    projectId.length === 0 ||
    workspaceId === undefined ||
    workspaceId.length === 0 ||
    fileName === undefined ||
    fileName.length === 0 ||
    mimeType === undefined ||
    mimeType.length === 0 ||
    contentLength === "invalid"
  ) {
    return NextResponse.json(
      { error: "workspaceId, projectId, taskId, file name, and MIME type are required." },
      { status: 400 },
    );
  }
  if (contentLength !== null && contentLength > maxUploadBytes) {
    return NextResponse.json({ error: "Task files must not exceed 25 MB." }, { status: 413 });
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
    if (bytes.byteLength > maxUploadBytes) {
      return NextResponse.json({ error: "Task files must not exceed 25 MB." }, { status: 413 });
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

function readContentLength(value: string | null): number | "invalid" | null {
  if (value === null) return null;
  if (!/^(0|[1-9][0-9]*)$/u.test(value)) return "invalid";
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : "invalid";
}
