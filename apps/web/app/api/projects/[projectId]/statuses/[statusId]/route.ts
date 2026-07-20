import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { isUpdateProjectStatusInput } from "../../../../../../lib/project-status-input";

type RouteContext = { params: Promise<{ projectId: string; statusId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const body: unknown = await request.json();
  if (!isUpdateProjectStatusInput(body))
    return NextResponse.json({ error: "Invalid project status payload." }, { status: 400 });
  return mutateProjectStatus("PATCH", request, context, body);
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  return mutateProjectStatus("DELETE", request, context, null);
}

async function mutateProjectStatus(
  method: "DELETE" | "PATCH",
  request: Request,
  context: RouteContext,
  body:
    | Parameters<ReturnType<typeof createTaskApiClient>["updateWorkspaceStatus"]>[0]["body"]
    | null,
): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null)
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const { projectId, statusId } = await context.params;
  try {
    const api = createTaskApiClient({
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    });
    const input = { workspaceId, projectId, statusId };
    const result =
      method === "DELETE"
        ? await api.deleteWorkspaceStatus(input)
        : await api.updateWorkspaceStatus({ ...input, body: body ?? {} });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to mutate project status.";
    return NextResponse.json({ error: message }, { status });
  }
}
