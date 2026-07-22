import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

export async function POST(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isIntegrationInput(input)) {
    return NextResponse.json(
      { error: "workspaceId and integrationId are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    const response = NextResponse.json(
      await result.api.createGoogleDrivePickerSession({
        integrationId: input.integrationId,
        workspaceId: input.workspaceId,
      }),
    );
    response.headers.set("cache-control", "no-store");
    response.headers.set("pragma", "no-cache");
    return response;
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to open Google Drive Picker.");
  }
}

function isIntegrationInput(
  value: unknown,
): value is { integrationId: string; workspaceId: string } {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, "workspaceId") &&
    hasNonEmptyString(value, "integrationId")
  );
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
