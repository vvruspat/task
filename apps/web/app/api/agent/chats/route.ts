import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../lib/server-task-api";

export async function GET(request: Request): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const result = createServerTaskApi();
  if (result.response !== undefined) return result.response;
  try {
    const query = new URL(request.url).searchParams.get("query")?.trim();
    return NextResponse.json(
      await result.api.listAgentChats({ workspaceId, ...(query === undefined ? {} : { query }) }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load agent chats.");
  }
}
