import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../lib/server-task-api";

type RouteContext = { params: Promise<{ memberId: string }> };

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isRoleUpdateInput(input)) {
    return NextResponse.json(
      { error: "workspaceId and a valid member role are required." },
      { status: 400 },
    );
  }
  const { memberId } = await context.params;
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.updateWorkspaceMemberRole({
        body: { role: input.role },
        memberId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to update the workspace member role.");
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const { memberId } = await context.params;
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.removeWorkspaceMember({ memberId, workspaceId }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to remove the workspace member.");
  }
}

function isRoleUpdateInput(
  value: unknown,
): value is { role: "admin" | "guest" | "member"; workspaceId: string } {
  if (typeof value !== "object" || value === null) return false;
  const role = "role" in value ? value.role : undefined;
  return (
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.trim().length > 0 &&
    (role === "admin" || role === "member" || role === "guest")
  );
}
