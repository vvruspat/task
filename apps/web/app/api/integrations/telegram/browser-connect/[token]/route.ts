import { NextResponse } from "next/server";
import { createServerTaskApi, taskApiErrorResponse } from "../../../../../../lib/server-task-api";

type BrowserConnectRouteInput =
  | { action: "preview"; authData: string }
  | { action: "complete"; authData: string; workspaceId?: string };

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const input: unknown = await request.json().catch((): null => null);
  if (!isBrowserConnectRouteInput(input)) {
    return NextResponse.json({ error: "Telegram connection payload is invalid." }, { status: 400 });
  }
  const { token } = await context.params;
  const result = createServerTaskApi(request);
  if (result.response !== undefined) return result.response;
  try {
    if (input.action === "preview") {
      return NextResponse.json(
        await result.api.previewTelegramBrowserConnect({
          body: { authData: input.authData },
          token,
        }),
      );
    }
    return NextResponse.json(
      await result.api.completeTelegramBrowserConnect({
        body: {
          authData: input.authData,
          ...(input.workspaceId === undefined ? {} : { workspaceId: input.workspaceId }),
        },
        token,
      }),
    );
  } catch (error: unknown) {
    return taskApiErrorResponse(error, "Unable to complete the Telegram connection.");
  }
}

function isBrowserConnectRouteInput(value: unknown): value is BrowserConnectRouteInput {
  if (!isRecord(value)) return false;
  const action = value["action"];
  const authData = value["authData"];
  const workspaceId = value["workspaceId"];
  return (
    (action === "preview" || action === "complete") &&
    typeof authData === "string" &&
    authData.length > 0 &&
    authData.length <= 4_096 &&
    (workspaceId === undefined ||
      (action === "complete" && typeof workspaceId === "string" && workspaceId.length > 0))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
