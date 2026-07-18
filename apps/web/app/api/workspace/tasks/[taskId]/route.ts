import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

type UpdateTaskStatusBody = {
  projectId: string;
  statusId: string | null;
  workspaceId: string;
  position?: string;
};

function isUpdateTaskStatusBody(value: unknown): value is UpdateTaskStatusBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "projectId" in value &&
    "statusId" in value &&
    "workspaceId" in value &&
    typeof value.projectId === "string" &&
    typeof value.workspaceId === "string" &&
    (typeof value.statusId === "string" || value.statusId === null) &&
    (!("position" in value) || typeof value.position === "string")
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json(
      { error: "TASK_USER_ID is not configured." },
      { status: 503 },
    );
  const payload: unknown = await request.json();
  if (!isUpdateTaskStatusBody(payload))
    return NextResponse.json(
      { error: "Invalid task status request." },
      { status: 400 },
    );
  const { taskId } = await context.params;
  const api = createTaskApiClient({
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    return NextResponse.json(
      await api.updateTaskStatus({
        workspaceId: payload.workspaceId,
        projectId: payload.projectId,
        taskId,
        body:
          payload.position === undefined
            ? { statusId: payload.statusId }
            : { statusId: payload.statusId, position: payload.position },
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError
        ? error.message
        : "Unable to update task.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
