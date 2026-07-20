import { createTaskApiClient, type TaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

type ServerTaskApiResult =
  | { api: TaskApiClient; response?: never }
  | { api?: never; response: NextResponse };

export type TaskRequestScope = {
  projectId: string;
  workspaceId: string;
};

export function createServerTaskApi(): ServerTaskApiResult {
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return {
      response: NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 }),
    };
  }

  return {
    api: createTaskApiClient({
      // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    }),
  };
}

export function readTaskRequestScope(request: Request): TaskRequestScope | null {
  const searchParams = new URL(request.url).searchParams;
  const projectId = searchParams.get("projectId")?.trim();
  const workspaceId = searchParams.get("workspaceId")?.trim();
  return projectId === undefined ||
    projectId.length === 0 ||
    workspaceId === undefined ||
    workspaceId.length === 0
    ? null
    : { projectId, workspaceId };
}

export function taskApiErrorResponse(error: unknown, fallback: string): NextResponse {
  const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
  const message = error instanceof TaskApiClientError ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}
