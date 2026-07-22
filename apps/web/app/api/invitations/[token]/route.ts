import type { InvitationPreview } from "@task/api-client";
import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { createServerTaskApi } from "../../../../lib/server-task-api";
import type { ApiFailure } from "../../../../lib/workspace-contracts";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse<InvitationPreview | ApiFailure>> {
  const { token } = await context.params;
  const api = createTaskApiClient({ baseUrl: apiBaseUrl, fetch });
  try {
    return NextResponse.json(await api.getInvitationPreview({ token }));
  } catch (error: unknown) {
    return invitationError(error, "Unable to load the invitation.");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await context.params;
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(await result.api.acceptInvitation({ token }));
  } catch (error: unknown) {
    return invitationError(error, "Unable to accept the invitation.");
  }
}

function invitationError(error: unknown, fallback: string): NextResponse<ApiFailure> {
  return NextResponse.json(
    { error: error instanceof TaskApiClientError ? error.message : fallback },
    { status: error instanceof TaskApiClientError ? (error.status ?? 502) : 502 },
  );
}
