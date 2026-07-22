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
    return NextResponse.json(
      await result.api.createTelegramConnectToken({
        integrationId: input.integrationId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to create a Telegram connect command.");
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
