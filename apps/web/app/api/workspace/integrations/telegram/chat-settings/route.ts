import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

type TelegramChatSettingsInput = {
  workspaceId: string;
  integrationId: string;
  connectionId: string;
  conversationHistoryAccess: boolean;
};

export async function PATCH(request: Request): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isTelegramChatSettingsInput(input)) {
    return NextResponse.json({ error: "Telegram chat settings are invalid." }, { status: 400 });
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    return NextResponse.json(
      await result.api.updateTelegramConnectionSettings({
        body: { conversationHistoryAccess: input.conversationHistoryAccess },
        connectionId: input.connectionId,
        integrationId: input.integrationId,
        workspaceId: input.workspaceId,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to update Telegram chat settings.");
  }
}

function isTelegramChatSettingsInput(value: unknown): value is TelegramChatSettingsInput {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, "workspaceId") &&
    hasNonEmptyString(value, "integrationId") &&
    hasNonEmptyString(value, "connectionId") &&
    typeof value["conversationHistoryAccess"] === "boolean"
  );
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  const property = value[key];
  return typeof property === "string" && property.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
