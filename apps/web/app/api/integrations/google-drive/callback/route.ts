import { createAppRedirect } from "../../../../../lib/app-redirect";
import { createServerTaskApi } from "../../../../../lib/server-task-api";

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError !== null || code === null || state === null) {
    return redirectToIntegrations("error");
  }
  const result = createServerTaskApi(request);
  if (result.response !== undefined) {
    return createAppRedirect("/login");
  }
  try {
    await result.api.completeGoogleDriveOAuth({ body: { code, state } });
    return redirectToIntegrations("connected");
  } catch (_error: unknown) {
    return redirectToIntegrations("error");
  }
}

function redirectToIntegrations(status: "connected" | "error"): Response {
  const query = new URLSearchParams({ googleDrive: status });
  return createAppRedirect(`/settings/integrations?${query.toString()}`);
}
