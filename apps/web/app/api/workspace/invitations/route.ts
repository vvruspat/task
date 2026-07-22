import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../lib/server-task-api";

export async function GET(request: Request): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.listWorkspaceInvitations({ workspaceId }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load workspace invitations.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isInvitationInput(input)) {
    return NextResponse.json(
      { error: "workspaceId, email, and a valid role are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.createWorkspaceInvitation({
        body: { email: input.email, role: input.role },
        workspaceId: input.workspaceId,
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to send the workspace invitation.");
  }
}

function isInvitationInput(
  value: unknown,
): value is { email: string; role: "admin" | "guest" | "member"; workspaceId: string } {
  if (typeof value !== "object" || value === null) return false;
  const role = "role" in value ? value.role : undefined;
  return (
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.length > 0 &&
    "email" in value &&
    typeof value.email === "string" &&
    (role === "admin" || role === "member" || role === "guest")
  );
}
