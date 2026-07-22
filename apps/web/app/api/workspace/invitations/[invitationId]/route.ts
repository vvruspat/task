import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../lib/server-task-api";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ invitationId: string }> },
): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const { invitationId } = await context.params;
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.revokeWorkspaceInvitation({ invitationId, workspaceId }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to revoke the workspace invitation.");
  }
}
