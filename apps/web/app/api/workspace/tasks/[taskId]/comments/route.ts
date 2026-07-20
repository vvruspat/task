import type { CreateTaskCommentInput } from "@task/api-client";
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
  const client = createServerTaskApi();
  if (client.response !== undefined) return client.response;

  try {
    const { taskId } = await context.params;
    return NextResponse.json(await client.api.listTaskComments({ ...scope, taskId }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load task comments.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
): Promise<NextResponse> {
  const scope = readTaskRequestScope(request);
  if (scope === null) {
    return NextResponse.json({ error: "workspaceId and projectId are required." }, { status: 400 });
  }
  const body = readCommentBody(await request.json());
  if (body === null) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }
  const client = createServerTaskApi();
  if (client.response !== undefined) return client.response;

  try {
    const { taskId } = await context.params;
    return NextResponse.json(await client.api.createTaskComment({ ...scope, taskId, body }), {
      status: 201,
    });
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to create task comment.");
  }
}

function readCommentBody(value: unknown): CreateTaskCommentInput | null {
  if (!isRecord(value)) return null;
  const body = readUnknown(value, "body");
  if (typeof body !== "string" || body.trim().length === 0) return null;
  const parentCommentId = readUnknown(value, "parentCommentId");
  if (
    parentCommentId !== undefined &&
    parentCommentId !== null &&
    (typeof parentCommentId !== "string" || !uuidPattern.test(parentCommentId))
  ) {
    return null;
  }
  const mentionedUserIds = readUnknown(value, "mentionedUserIds");
  if (
    mentionedUserIds !== undefined &&
    (!Array.isArray(mentionedUserIds) ||
      mentionedUserIds.some((userId) => typeof userId !== "string" || !uuidPattern.test(userId)))
  ) {
    return null;
  }
  return {
    body: body.trim(),
    ...(parentCommentId === undefined ? {} : { parentCommentId }),
    ...(mentionedUserIds === undefined ? {} : { mentionedUserIds: [...new Set(mentionedUserIds)] }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readUnknown(value: Record<string, unknown>, key: string): unknown {
  return value[key];
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
