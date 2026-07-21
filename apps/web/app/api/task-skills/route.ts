import {
  type CreateTaskSkillInput,
  createTaskApiClient,
  TaskApiClientError,
} from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../lib/auth";

type CreateTaskSkillBody = {
  input: CreateTaskSkillInput;
  workspaceId: string;
};

export async function POST(request: Request): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const body: unknown = await request.json();
  if (!isCreateTaskSkillBody(body))
    return NextResponse.json({ error: "Invalid task skill payload." }, { status: 400 });
  try {
    const api = createTaskApiClient({
      baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
      fetch,
      trustedUserId,
    });
    return NextResponse.json(
      await api.createTaskSkill({
        workspaceId: body.workspaceId,
        body: body.input,
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return apiError(error, "Unable to create task skill.");
  }
}

function isCreateTaskSkillBody(value: unknown): value is CreateTaskSkillBody {
  if (!isRecord(value) || typeof value["workspaceId"] !== "string") return false;
  const input = value["input"];
  return (
    isRecord(input) &&
    typeof input["name"] === "string" &&
    input["name"].trim().length > 0 &&
    isOptionalNullableString(input["description"]) &&
    isOptionalStringArray(input["aliases"]) &&
    hasValidDefinition(input["definition"])
  );
}

function hasValidDefinition(value: unknown): boolean {
  if (!isRecord(value) || !Array.isArray(value["subtasks"]) || value["subtasks"].length === 0)
    return false;
  return value["subtasks"].every(
    (subtask) =>
      isRecord(subtask) &&
      typeof subtask["title"] === "string" &&
      subtask["title"].trim().length > 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalStringArray(value: unknown): boolean {
  return (
    value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function apiError(error: unknown, fallback: string): NextResponse {
  return NextResponse.json(
    { error: error instanceof TaskApiClientError ? error.message : fallback },
    { status: 502 },
  );
}
