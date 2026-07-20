import { NextResponse } from "next/server";
import {
  createServerTaskApi,
  readTaskRequestScope,
  taskApiErrorResponse,
} from "../../../../../../lib/server-task-api";

type Context = { params: Promise<{ taskId: string }> };

export async function GET(request: Request, context: Context): Promise<NextResponse> {
  return handle(request, context, "get");
}

export async function PUT(request: Request, context: Context): Promise<NextResponse> {
  return handle(request, context, "subscribe");
}

export async function DELETE(request: Request, context: Context): Promise<NextResponse> {
  return handle(request, context, "unsubscribe");
}

async function handle(
  request: Request,
  context: Context,
  action: "get" | "subscribe" | "unsubscribe",
): Promise<NextResponse> {
  const scope = readTaskRequestScope(request);
  if (scope === null)
    return NextResponse.json({ error: "workspaceId and projectId are required." }, { status: 400 });
  const client = createServerTaskApi();
  if (client.response !== undefined) return client.response;
  try {
    const { taskId } = await context.params;
    const input = { ...scope, taskId };
    if (action === "subscribe") return NextResponse.json(await client.api.subscribeToTask(input));
    if (action === "unsubscribe")
      return NextResponse.json(await client.api.unsubscribeFromTask(input));
    return NextResponse.json(await client.api.getTaskSubscription(input));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to update task subscription.");
  }
}
