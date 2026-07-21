import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../lib/server-task-api";

type RouteContext = { params: Promise<{ chatId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const scope = await readScope(request, context);
  if (scope === null)
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.getAgentChat(scope));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load the agent chat.");
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const scope = await readScope(request, context);
  const body: unknown = await request.json().catch((): null => null);
  if (scope === null || !isTitleUpdate(body)) {
    return NextResponse.json({ error: "workspaceId and title are required." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.updateAgentChat({ ...scope, body }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to rename the agent chat.");
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const scope = await readScope(request, context);
  if (scope === null)
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.deleteAgentChat(scope));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to delete the agent chat.");
  }
}

async function readScope(
  request: Request,
  context: RouteContext,
): Promise<{ chatId: string; workspaceId: string } | null> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) return null;
  const { chatId } = await context.params;
  return { chatId, workspaceId };
}

function isTitleUpdate(value: unknown): value is { title: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "title" in value &&
    typeof value.title === "string" &&
    value.title.trim().length > 0
  );
}
