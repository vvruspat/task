import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

type FolderTargetInput = {
  integrationId: string;
  targetId: string;
  targetType: "project" | "task";
  workspaceId: string;
};

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const input = parseTargetInput({
    integrationId: url.searchParams.get("integrationId"),
    targetId: url.searchParams.get("targetId"),
    targetType: url.searchParams.get("targetType"),
    workspaceId: url.searchParams.get("workspaceId"),
  });
  if (input === null) return invalidTargetResponse();
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.getYandexDiskFolderAssignment(input));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load the Yandex Disk folder.");
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const value: unknown = await request.json().catch((): null => null);
  if (!isRecord(value) || typeof value["path"] !== "string") return invalidTargetResponse();
  const input = parseTargetInput(value);
  if (input === null || value["path"].trim().length === 0) return invalidTargetResponse();
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.selectYandexDiskFolder({
        ...input,
        body: { path: value["path"].trim() },
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to assign the Yandex Disk folder.");
  }
}

function parseTargetInput(value: Readonly<Record<string, unknown>>): FolderTargetInput | null {
  const integrationId = readNonEmptyString(value, "integrationId");
  const targetId = readNonEmptyString(value, "targetId");
  const targetType = value["targetType"];
  const workspaceId = readNonEmptyString(value, "workspaceId");
  if (
    integrationId === null ||
    targetId === null ||
    (targetType !== "project" && targetType !== "task") ||
    workspaceId === null
  ) {
    return null;
  }
  return { integrationId, targetId, targetType, workspaceId };
}

function readNonEmptyString(value: Readonly<Record<string, unknown>>, key: string): string | null {
  const property = value[key];
  if (typeof property !== "string") return null;
  const trimmed = property.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidTargetResponse(): NextResponse {
  return NextResponse.json(
    { error: "Yandex Disk folder assignment input is invalid." },
    { status: 400 },
  );
}
