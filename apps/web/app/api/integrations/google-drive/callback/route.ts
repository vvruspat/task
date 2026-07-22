import { NextResponse } from "next/server";
import { createServerTaskApi } from "../../../../../lib/server-task-api";

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError !== null || code === null || state === null) {
    return redirectToIntegrations(requestUrl, "error");
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) {
    return NextResponse.redirect(new URL("/login", requestUrl));
  }
  try {
    await result.api.completeGoogleDriveOAuth({ body: { code, state } });
    return redirectToIntegrations(requestUrl, "connected");
  } catch (_error: unknown) {
    return redirectToIntegrations(requestUrl, "error");
  }
}

function redirectToIntegrations(requestUrl: URL, status: "connected" | "error"): NextResponse {
  const target = new URL("/settings/integrations", requestUrl);
  target.searchParams.set("googleDrive", status);
  return NextResponse.redirect(target);
}
