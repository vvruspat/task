import { readAuthenticatedUserId } from "../../../../lib/auth";

const apiBaseUrl = readEnvironment("TASK_API_BASE_URL") ?? "http://localhost:3000";

export async function GET(request: Request): Promise<Response> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (workspaceId === null || !uuidV4Pattern.test(workspaceId)) {
    return Response.json({ error: "workspaceId must be a UUID v4." }, { status: 400 });
  }
  const upstream = await fetch(
    `${apiBaseUrl}/workspaces/${encodeURIComponent(workspaceId)}/events`,
    {
      cache: "no-store",
      headers: {
        accept: "text/event-stream",
        "x-task-user-id": trustedUserId,
      },
      signal: request.signal,
    },
  );
  if (!upstream.ok || upstream.body === null) {
    return Response.json(
      { error: `Realtime API request failed with status ${upstream.status}.` },
      { status: upstream.status },
    );
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream",
      "x-accel-buffering": "no",
    },
  });
}

function readEnvironment(name: "TASK_API_BASE_URL"): string | undefined {
  return process.env[name];
}

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
