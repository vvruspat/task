import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../../lib/auth";

type TaskMutationContext = {
  projectId: string;
  workspaceId: string;
};

type UpdateTaskDetailsBody = TaskMutationContext & {
  operation: "details";
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

type UpdateTaskStatusBody = TaskMutationContext & {
  operation: "status";
  statusId: string | null;
  position?: string;
};

type UpdateTaskAssigneeBody = TaskMutationContext & {
  operation: "assignee";
  assigneeUserId: string | null;
};

type UpdateTaskDueDateBody = TaskMutationContext & {
  operation: "due-date";
  dueAt: string | null;
};

type TaskMutationBody =
  | UpdateTaskDetailsBody
  | UpdateTaskStatusBody
  | UpdateTaskAssigneeBody
  | UpdateTaskDueDateBody;

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");
  const projectId = url.searchParams.get("projectId");
  if (workspaceId === null || projectId === null) {
    return NextResponse.json({ error: "workspaceId and projectId are required." }, { status: 400 });
  }
  const { taskId } = await context.params;
  const api = createTaskApiClient({
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    return NextResponse.json(await api.getTask({ workspaceId, projectId, taskId }));
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message = error instanceof TaskApiClientError ? error.message : "Unable to load task.";
    return NextResponse.json({ error: message }, { status });
  }
}

function parseTaskMutationBody(value: unknown): TaskMutationBody | null {
  if (!isObject(value)) return null;
  const workspaceId = readString(value, "workspaceId");
  const projectId = readString(value, "projectId");
  if (workspaceId === null || projectId === null) return null;

  const operation = readString(value, "operation") ?? ("statusId" in value ? "status" : null);
  if (operation === "status") {
    const statusId = readNullableString(value, "statusId");
    const position = readOptionalString(value, "position");
    if (statusId === undefined || position === null) return null;
    return position === undefined
      ? { operation, projectId, statusId, workspaceId }
      : { operation, position, projectId, statusId, workspaceId };
  }
  if (operation === "assignee") {
    const assigneeUserId = readNullableString(value, "assigneeUserId");
    return assigneeUserId === undefined
      ? null
      : { assigneeUserId, operation, projectId, workspaceId };
  }
  if (operation === "due-date") {
    const dueAt = readNullableString(value, "dueAt");
    return dueAt === undefined ? null : { dueAt, operation, projectId, workspaceId };
  }
  if (operation !== "details") return null;

  const title = readOptionalString(value, "title");
  const metadata = readOptionalObject(value, "metadata");
  const hasDescription = "description" in value;
  // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
  const description = value["description"];
  if (
    title === null ||
    metadata === null ||
    (hasDescription && typeof description !== "string" && description !== null)
  )
    return null;
  if (title === undefined && !hasDescription && metadata === undefined) return null;

  return {
    operation,
    projectId,
    workspaceId,
    ...(title === undefined ? {} : { title }),
    ...(hasDescription && (typeof description === "string" || description === null)
      ? { description }
      : {}),
    ...(metadata === undefined ? {} : { metadata }),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const payload = parseTaskMutationBody(await request.json());
  if (payload === null)
    return NextResponse.json({ error: "Invalid task update request." }, { status: 400 });

  const { taskId } = await context.params;
  const api = createTaskApiClient({
    // biome-ignore lint/complexity/useLiteralKeys: noPropertyAccessFromIndexSignature requires bracket access.
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });

  try {
    const taskContext = {
      workspaceId: payload.workspaceId,
      projectId: payload.projectId,
      taskId,
    };
    if (payload.operation === "details") {
      return NextResponse.json(
        await api.updateTask({
          ...taskContext,
          body: {
            ...(payload.title === undefined ? {} : { title: payload.title }),
            ...(payload.description === undefined ? {} : { description: payload.description }),
            ...(payload.metadata === undefined ? {} : { metadata: payload.metadata }),
          },
        }),
      );
    }
    if (payload.operation === "assignee") {
      return NextResponse.json(
        await api.updateTaskAssignee({
          ...taskContext,
          body: { assigneeUserId: payload.assigneeUserId },
        }),
      );
    }
    if (payload.operation === "due-date") {
      return NextResponse.json(
        await api.updateTaskDueDate({ ...taskContext, body: { dueAt: payload.dueAt } }),
      );
    }
    return NextResponse.json(
      await api.updateTaskStatus({
        ...taskContext,
        body:
          payload.position === undefined
            ? { statusId: payload.statusId }
            : { position: payload.position, statusId: payload.statusId },
      }),
    );
  } catch (error: unknown) {
    const status = error instanceof TaskApiClientError ? (error.status ?? 502) : 502;
    const message = error instanceof TaskApiClientError ? error.message : "Unable to update task.";
    return NextResponse.json({ error: message }, { status });
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string | null {
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0 ? property : null;
}

function readOptionalString(
  value: Record<string, unknown>,
  key: string,
): string | null | undefined {
  if (!(key in value)) return undefined;
  return readString(value, key);
}

function readNullableString(
  value: Record<string, unknown>,
  key: string,
): string | null | undefined {
  const property = value[key];
  return property === null || typeof property === "string" ? property : undefined;
}

function readOptionalObject(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null | undefined {
  if (!(key in value)) return undefined;
  const property = value[key];
  return isObject(property) ? property : null;
}
