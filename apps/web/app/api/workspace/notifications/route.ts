import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../lib/server-task-api";

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request, "list");
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request, "read");
}

async function handle(request: Request, action: "list" | "read"): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const client = createServerTaskApi(request);
  if (client.response !== undefined) return client.response;
  try {
    const feed =
      action === "read"
        ? await client.api.markAllNotificationsRead({ workspaceId })
        : await client.api.listNotifications({ workspaceId });
    return NextResponse.json(feed);
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load notifications.");
  }
}
