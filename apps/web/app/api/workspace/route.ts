import type { WorkspaceDetail } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../lib/auth";
import {
  loadWorkspaceSnapshotData,
  WorkspaceSnapshotLoadError,
} from "../../../lib/server-workspace-snapshot";
import type { WorkspaceBootstrapRequest } from "../../../lib/workspace-bootstrap";
import type {
  ApiFailure,
  WorkspaceBootstrap,
  WorkspaceRequired,
} from "../../../lib/workspace-contracts";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";
export async function GET(
  request: Request,
): Promise<NextResponse<WorkspaceBootstrap | WorkspaceRequired | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const startedAt = performance.now();
  try {
    const url = new URL(request.url);
    const bootstrapRequest = readWorkspaceBootstrapRequest(url.searchParams);
    if (bootstrapRequest === null) {
      return NextResponse.json({ error: "Invalid workspace payload scope." }, { status: 400 });
    }
    const payload = await loadWorkspaceSnapshotData({
      request: bootstrapRequest,
      trustedUserId,
      workspaceSelector: url.searchParams.get("workspace"),
    });
    return measuredWorkspaceResponse(payload, bootstrapRequest.scope, startedAt);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load workspace data.";
    return NextResponse.json(
      { error: message },
      { status: error instanceof WorkspaceSnapshotLoadError ? error.status : 502 },
    );
  }
}

function readWorkspaceBootstrapRequest(
  parameters: URLSearchParams,
): WorkspaceBootstrapRequest | null {
  const scope = parameters.get("scope") ?? "shell";
  const tasks = parameters.get("tasks");
  const skills = parameters.get("skills");
  if (
    (scope !== "shell" && scope !== "project" && scope !== "templates" && scope !== "view") ||
    (tasks !== null && tasks !== "1") ||
    (skills !== null && skills !== "1")
  ) {
    return null;
  }
  return {
    includeProjectTasks: scope === "view" || tasks === "1",
    includeTaskSkills: scope === "templates" || scope === "view" || skills === "1",
    projectSelector: parameters.get("project"),
    scope,
    viewSelector: parameters.get("view"),
  };
}

function measuredWorkspaceResponse(
  payload: WorkspaceBootstrap | WorkspaceRequired,
  scope: WorkspaceBootstrapRequest["scope"],
  startedAt: number,
): NextResponse<WorkspaceBootstrap | WorkspaceRequired> {
  const response = NextResponse.json(payload);
  const durationMs = Math.max(0, performance.now() - startedAt);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  response.headers.set("server-timing", `workspace-bootstrap;dur=${durationMs.toFixed(1)}`);
  response.headers.set("x-workspace-bootstrap-scope", scope);
  response.headers.set("x-workspace-payload-bytes", String(payloadBytes));
  return response;
}

export async function POST(request: Request): Promise<NextResponse<WorkspaceDetail | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const input = await request.json().catch((): null => null);
  if (!isWorkspaceCreate(input)) {
    return NextResponse.json({ error: "Введите название рабочего пространства." }, { status: 400 });
  }
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(await api.createWorkspace({ body: { name: input.name.trim() } }), {
      status: 201,
    });
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Не удалось создать workspace.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request): Promise<NextResponse<WorkspaceDetail | ApiFailure>> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const input = await request.json().catch((): null => null);
  if (!isWorkspaceUpdate(input)) {
    return NextResponse.json(
      { error: "workspaceId and at least one editable field are required." },
      { status: 400 },
    );
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(
      await api.updateWorkspace({
        body: {
          ...(input.name === undefined ? {} : { name: input.name.trim() }),
          ...(input.description === undefined ? {} : { description: input.description }),
        },
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update workspace.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
  }

  const input = await request.json().catch((): null => null);
  if (!isWorkspaceDelete(input)) {
    return NextResponse.json({ error: "Не указан workspace для удаления." }, { status: 400 });
  }

  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch, trustedUserId });
  try {
    return NextResponse.json(await api.deleteWorkspace({ workspaceId: input.workspaceId }));
  } catch (error: unknown) {
    if (error instanceof TaskApiClientError) {
      const status = error.status === 403 || error.status === 404 ? error.status : 502;
      const message =
        status === 403
          ? "Удалить workspace может только его владелец."
          : status === 404
            ? "Workspace уже удалён или не найден."
            : "Не удалось удалить workspace.";
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json({ error: "Не удалось удалить workspace." }, { status: 502 });
  }
}

function isWorkspaceCreate(value: unknown): value is { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= 80
  );
}

function isWorkspaceDelete(value: unknown): value is { workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    value.workspaceId.trim().length > 0
  );
}

function isWorkspaceUpdate(
  value: unknown,
): value is { description?: string | null; name?: string; workspaceId: string } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("workspaceId" in value) ||
    typeof value.workspaceId !== "string"
  )
    return false;
  const hasName = "name" in value;
  const hasDescription = "description" in value;
  return (
    (hasName || hasDescription) &&
    (!hasName ||
      (typeof value.name === "string" &&
        value.name.trim().length > 0 &&
        value.name.trim().length <= 80)) &&
    (!hasDescription || value.description === null || typeof value.description === "string")
  );
}

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}
