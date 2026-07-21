import { NextResponse } from "next/server";
import {
  createServerTaskApi,
  readTaskRequestScope,
  taskApiErrorResponse,
} from "../../../../../../lib/server-task-api";

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const scope = readTaskRequestScope(request);
  if (scope === null) {
    return NextResponse.json({ error: "workspaceId and projectId are required." }, { status: 400 });
  }
  const client = createServerTaskApi(request);
  if (client.response !== undefined) return client.response;

  try {
    const { taskId } = await context.params;
    return NextResponse.json(await client.api.listTaskActivity({ ...scope, taskId }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load task activity.");
  }
}
