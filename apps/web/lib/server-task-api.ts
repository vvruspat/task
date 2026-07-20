import { createTaskApiClient, type TaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "./auth";

type ServerTaskApiResult =
  | { api: TaskApiClient; response?: never }
  | { api?: never; response: NextResponse };

export type TaskRequestScope = {
  projectId: string;
  workspaceId: string;
};

export function createServerTaskApi(request: Request): ServerTaskApiResult {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined) {
    return {
      response: NextResponse.json({ error: "Authentication is required." }, { status: 401 }),
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
