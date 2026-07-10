import type { ConfirmationRequestSummary, TaskApiClient } from "@task/api-client";

export type ConfirmationApi = Pick<
  TaskApiClient,
  "cancelConfirmationRequest" | "confirmConfirmationRequest" | "listPendingConfirmationRequests"
>;

export type ConfirmationRequestLoadResult =
  | { requests: ConfirmationRequestSummary[]; status: "loaded" }
  | { message: string; requests: ConfirmationRequestSummary[]; status: "error" };

export type ConfirmationResolutionResult =
  | { confirmationRequestId: string; status: "resolved" }
  | { message: string; status: "error" };

export async function loadConfirmationRequests(
  client: ConfirmationApi,
  workspaceId: string,
): Promise<ConfirmationRequestLoadResult> {
  try {
    return {
      requests: await client.listPendingConfirmationRequests({ workspaceId }),
      status: "loaded",
    };
  } catch (error: unknown) {
    return { message: readErrorMessage(error), requests: [], status: "error" };
  }
}

export async function resolveConfirmationRequest(
  client: ConfirmationApi,
  input: { action: "cancel" | "confirm"; confirmationRequestId: string; workspaceId: string },
): Promise<ConfirmationResolutionResult> {
  try {
    if (input.action === "confirm") {
      await client.confirmConfirmationRequest(input);
    } else {
      await client.cancelConfirmationRequest(input);
    }
    return { confirmationRequestId: input.confirmationRequestId, status: "resolved" };
  } catch (error: unknown) {
    return { message: readErrorMessage(error), status: "error" };
  }
}

export function formatConfirmationPreview(preview: Record<string, unknown>): string[] {
  const entries = Object.entries(preview);
  return entries.length === 0
    ? ["No additional details were provided."]
    : entries.map(([key, value]) => `${key}: ${formatPreviewValue(value)}`);
}

export function isConfirmationActionPending(status: string): boolean {
  return status === "cancelling" || status === "confirming";
}

function formatPreviewValue(value: unknown, depth = 0): string {
  if (value === null) return "none";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (depth >= 2) return "[details]";
  if (Array.isArray(value))
    return value.map((item) => formatPreviewValue(item, depth + 1)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${formatPreviewValue(item, depth + 1)}`)
      .join(", ");
  }
  return "[unavailable]";
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Confirmation request could not be completed.";
}
