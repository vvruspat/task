import {
  type CloneTaskSkillInput,
  createTaskApiClient,
  type PreviewTaskSkillApplyInput,
  TaskApiClientError,
  type UpdateTaskSkillDefinitionInput,
  type UpdateTaskSkillMetadataInput,
} from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../lib/auth";

type RouteContext = { params: Promise<{ taskSkillId: string }> };
type MetadataBody = {
  action: "metadata";
  input: UpdateTaskSkillMetadataInput;
  workspaceId: string;
};
type DefinitionBody = {
  action: "definition";
  input: UpdateTaskSkillDefinitionInput;
  workspaceId: string;
};
type CloneBody = {
  action: "clone";
  input: CloneTaskSkillInput;
  workspaceId: string;
};
type ApplyBody = {
  action: "apply" | "preview";
  input: PreviewTaskSkillApplyInput;
  workspaceId: string;
};

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null)
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  return withClient(
    async (api) => {
      const { taskSkillId } = await context.params;
      return NextResponse.json(await api.getTaskSkill({ taskSkillId, workspaceId }));
    },
    "Unable to load task skill.",
    request,
  );
}

export async function PATCH(request: Request, context: RouteContext): Promise<NextResponse> {
  const body: unknown = await request.json();
  if (!isMetadataBody(body) && !isDefinitionBody(body))
    return NextResponse.json({ error: "Invalid task skill update." }, { status: 400 });
  return withClient(
    async (api) => {
      const { taskSkillId } = await context.params;
      const result =
        body.action === "metadata"
          ? await api.updateTaskSkillMetadata({
              body: body.input,
              taskSkillId,
              workspaceId: body.workspaceId,
            })
          : await api.updateTaskSkillDefinition({
              body: body.input,
              taskSkillId,
              workspaceId: body.workspaceId,
            });
      return NextResponse.json(result);
    },
    "Unable to update task skill.",
    request,
  );
}

export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  const body: unknown = await request.json();
  if (!isCloneBody(body) && !isApplyBody(body))
    return NextResponse.json({ error: "Invalid task skill action." }, { status: 400 });
  return withClient(
    async (api) => {
      const { taskSkillId } = await context.params;
      if (body.action === "clone")
        return NextResponse.json(
          await api.cloneTaskSkill({
            body: body.input,
            taskSkillId,
            workspaceId: body.workspaceId,
          }),
          { status: 201 },
        );
      if (body.action === "preview")
        return NextResponse.json(
          await api.previewTaskSkillApply({
            body: body.input,
            taskSkillId,
            workspaceId: body.workspaceId,
          }),
        );
      const result = await api.applyTaskSkill({
        body: body.input,
        taskSkillId,
        workspaceId: body.workspaceId,
      });
      return NextResponse.json(
        {
          createdCount: result.subtasks.length + 1,
          projectId: result.projectId,
          rootTaskId: result.rootTask.id,
        },
        { status: 201 },
      );
    },
    "Unable to run task skill action.",
    request,
  );
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null)
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  return withClient(
    async (api) => {
      const { taskSkillId } = await context.params;
      return NextResponse.json(await api.archiveTaskSkill({ taskSkillId, workspaceId }));
    },
    "Unable to archive task skill.",
    request,
  );
}

async function withClient(
  action: (api: ReturnType<typeof createTaskApiClient>) => Promise<NextResponse>,
  fallback: string,
  request: Request,
): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  try {
    return await action(
      createTaskApiClient({
        baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
        fetch,
        trustedUserId,
      }),
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof TaskApiClientError ? error.message : fallback },
      { status: 502 },
    );
  }
}

function isMetadataBody(value: unknown): value is MetadataBody {
  if (!hasActionInput(value, "metadata")) return false;
  const input = value["input"];
  if (!isRecord(input)) return false;
  const hasName = typeof input["name"] === "string" && input["name"].trim().length > 0;
  const hasDescription = input["description"] === null || typeof input["description"] === "string";
  const hasAliases = isStringArray(input["aliases"]);
  return hasName || hasDescription || hasAliases;
}

function isDefinitionBody(value: unknown): value is DefinitionBody {
  return hasActionInput(value, "definition") && isDefinition(value["input"]);
}

function isCloneBody(value: unknown): value is CloneBody {
  if (!hasActionInput(value, "clone")) return false;
  const input = value["input"];
  return (
    isRecord(input) &&
    typeof input["name"] === "string" &&
    input["name"].trim().length > 0 &&
    (input["description"] === undefined ||
      input["description"] === null ||
      typeof input["description"] === "string") &&
    (input["aliases"] === undefined || isStringArray(input["aliases"]))
  );
}

function isApplyBody(value: unknown): value is ApplyBody {
  if (!isRecord(value) || (value["action"] !== "preview" && value["action"] !== "apply"))
    return false;
  if (typeof value["workspaceId"] !== "string" || !isRecord(value["input"])) return false;
  const input = value["input"];
  if (
    typeof input["projectId"] !== "string" ||
    typeof input["rootTaskTitle"] !== "string" ||
    input["rootTaskTitle"].trim().length === 0
  )
    return false;
  if (input["overrides"] === undefined) return true;
  if (!isRecord(input["overrides"])) return false;
  return (
    (input["overrides"]["addSubtasks"] === undefined ||
      isStringArray(input["overrides"]["addSubtasks"])) &&
    (input["overrides"]["removeSubtasks"] === undefined ||
      isStringArray(input["overrides"]["removeSubtasks"]))
  );
}

function hasActionInput(value: unknown, action: string): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value["action"] === action &&
    typeof value["workspaceId"] === "string" &&
    "input" in value
  );
}

function isDefinition(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value["definition"])) return false;
  const subtasks = value["definition"]["subtasks"];
  return (
    Array.isArray(subtasks) &&
    subtasks.length > 0 &&
    subtasks.every(
      (subtask) =>
        isRecord(subtask) &&
        typeof subtask["title"] === "string" &&
        subtask["title"].trim().length > 0,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
