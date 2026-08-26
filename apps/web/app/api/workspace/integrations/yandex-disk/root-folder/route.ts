import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

export async function PUT(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isRootFolderInput(input)) {
    return NextResponse.json(
      { error: "workspaceId, integrationId, and path are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.selectYandexDiskRootFolder({
        body: { path: input.path.trim() },
        integrationId: input.integrationId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to select the Yandex Disk root folder.");
  }
}

function isRootFolderInput(
  value: unknown,
): value is { integrationId: string; path: string; workspaceId: string } {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, "workspaceId") &&
    hasNonEmptyString(value, "integrationId") &&
    hasNonEmptyString(value, "path")
  );
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
