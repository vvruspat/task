import { createTaskApiClient, type ProjectDetail, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import type { ApiFailure } from "../../../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";
const trustedUserId = readEnvironment("TASK_USER_ID");

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<NextResponse<ProjectDetail | ApiFailure>> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  }

  const input = await request.json().catch((): null => null);
  if (!isProjectDescriptionUpdate(input)) {
    return NextResponse.json(
      { error: "workspaceId and description are required." },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(
      await api.updateProject({
        body: { description: input.description },
        projectId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update project.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function isProjectDescriptionUpdate(
  value: unknown,
): value is { description: string | null; workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "description" in value &&
    (value.description === null || typeof value.description === "string")
  );
}

function readEnvironment(name: "TASK_API_BASE_URL" | "TASK_USER_ID"): string | undefined {
  return process.env[name];
}
