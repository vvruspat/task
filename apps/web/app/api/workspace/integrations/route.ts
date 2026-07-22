import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../lib/server-task-api";

export async function GET(request: Request): Promise<NextResponse> {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId")?.trim();
  if (workspaceId === undefined || workspaceId.length === 0) {
    return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.listWorkspaceIntegrations({ workspaceId }));
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to load workspace integrations.");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isInstallInput(input)) {
    return NextResponse.json({ error: "workspaceId and pluginKey are required." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.installWorkspaceIntegration({
        pluginKey: input.pluginKey,
        workspaceId: input.workspaceId,
      }),
      { status: 201 },
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to enable the workspace integration.");
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isUninstallInput(input)) {
    return NextResponse.json(
      { error: "workspaceId and integrationId are required." },
      { status: 400 },
    );
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.uninstallWorkspaceIntegration({
        integrationId: input.integrationId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to remove the workspace integration.");
  }
}

function isInstallInput(value: unknown): value is { pluginKey: string; workspaceId: string } {
  return hasNonEmptyString(value, "workspaceId") && hasNonEmptyString(value, "pluginKey");
}

function isUninstallInput(value: unknown): value is { integrationId: string; workspaceId: string } {
  return hasNonEmptyString(value, "workspaceId") && hasNonEmptyString(value, "integrationId");
}

function hasNonEmptyString(value: unknown, key: string): boolean {
  if (!isObject(value)) return false;
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
