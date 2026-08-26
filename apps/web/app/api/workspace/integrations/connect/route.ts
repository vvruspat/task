import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../lib/server-task-api";

export async function POST(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isConnectInput(input)) {
    return NextResponse.json(
      { error: "workspaceId and integrationId are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    const response =
      input.pluginKey === "yandex-disk"
        ? await result.api.startYandexDiskOAuth({
            integrationId: input.integrationId,
            workspaceId: input.workspaceId,
          })
        : await result.api.startGoogleDriveOAuth({
            integrationId: input.integrationId,
            workspaceId: input.workspaceId,
          });
    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to connect the cloud drive.");
  }
}

function isConnectInput(value: unknown): value is {
  integrationId: string;
  pluginKey: "google-drive" | "yandex-disk";
  workspaceId: string;
} {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, "workspaceId") &&
    hasNonEmptyString(value, "integrationId") &&
    (value["pluginKey"] === "google-drive" || value["pluginKey"] === "yandex-disk")
  );
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
