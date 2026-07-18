import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";

type CreateProjectPayload = {
  description: string;
  kind: "project";
  title: string;
  workspaceId: string;
};
type CreateTaskPayload = {
  description: string;
  kind: "task";
  projectId: string;
  title: string;
  workspaceId: string;
};
type CreateSkillPayload = {
  description: string;
  kind: "skill";
  title: string;
  workspaceId: string;
};
type CreatePayload = CreateProjectPayload | CreateTaskPayload | CreateSkillPayload;

function isBasePayload(
  value: unknown,
): value is { description: string; kind: unknown; title: string; workspaceId: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "description" in value &&
    "kind" in value &&
    "title" in value &&
    "workspaceId" in value &&
    typeof value.description === "string" &&
    typeof value.title === "string" &&
    typeof value.workspaceId === "string"
  );
}
function isCreatePayload(value: unknown): value is CreatePayload {
  if (!isBasePayload(value)) return false;
  if (value.kind === "project" || value.kind === "skill") return true;
  return value.kind === "task" && "projectId" in value && typeof value.projectId === "string";
}

export async function POST(request: Request): Promise<NextResponse> {
  const trustedUserId = process.env["TASK_USER_ID"];
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
  const payload: unknown = await request.json();
  if (!isCreatePayload(payload) || payload.title.trim().length === 0)
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  const api = createTaskApiClient({
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    if (payload.kind === "project")
      return NextResponse.json(
        await api.createProject({
          workspaceId: payload.workspaceId,
          body: { title: payload.title.trim(), description: nullableText(payload.description) },
        }),
        { status: 201 },
      );
    if (payload.kind === "task")
      return NextResponse.json(
        await api.createTask({
          workspaceId: payload.workspaceId,
          projectId: payload.projectId,
          body: { title: payload.title.trim(), description: nullableText(payload.description) },
        }),
        { status: 201 },
      );
    return NextResponse.json(
      await api.createTaskSkill({
        workspaceId: payload.workspaceId,
        body: {
          name: payload.title.trim(),
          description: nullableText(payload.description),
          definition: { version: 1, subtasks: [] },
        },
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof TaskApiClientError ? error.message : "Unable to create item." },
      { status: 502 },
    );
  }
}
function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
