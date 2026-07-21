import { createTaskApiClient, TaskApiClientError } from "@task/api-client";
import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../../lib/auth";

type ConfirmationBody = { action: "cancel" | "confirm"; workspaceId: string };
function isConfirmationBody(value: unknown): value is ConfirmationBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "action" in value &&
    "workspaceId" in value &&
    (value.action === "cancel" || value.action === "confirm") &&
    typeof value.workspaceId === "string"
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ confirmationId: string }> },
): Promise<NextResponse> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0)
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  const payload: unknown = await request.json();
  if (!isConfirmationBody(payload))
    return NextResponse.json({ error: "Invalid confirmation request." }, { status: 400 });
  const { confirmationId } = await context.params;
  const api = createTaskApiClient({
    baseUrl: process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000",
    fetch,
    trustedUserId,
  });
  try {
    const input = { workspaceId: payload.workspaceId, confirmationRequestId: confirmationId };
    return NextResponse.json(
      payload.action === "confirm"
        ? await api.confirmConfirmationRequest(input)
        : await api.cancelConfirmationRequest(input),
    );
  } catch (error: unknown) {
    const message =
      error instanceof TaskApiClientError ? error.message : "Unable to update confirmation.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
