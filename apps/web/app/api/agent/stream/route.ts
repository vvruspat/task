import { NextResponse } from "next/server";
import { readAuthenticatedUserId } from "../../../../lib/auth";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";

type AgentStreamRequest = {
  chatId: string | null;
  workspaceId: string;
  projectId: string | null;
  message: string;
};

export async function POST(request: Request): Promise<Response> {
  const trustedUserId = readAuthenticatedUserId(request);
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const body: unknown = await request.json();
  if (!isAgentStreamRequest(body)) {
    return NextResponse.json({ error: "Agent stream request is invalid." }, { status: 400 });
  }

  const response = await fetch(
    `${apiBaseUrl}/workspaces/${encodeURIComponent(body.workspaceId)}/agent/chat/stream`,
    {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        "x-task-user-id": trustedUserId,
      },
      body: JSON.stringify({
        chatId: body.chatId,
        message: body.message,
        projectId: body.projectId,
      }),
      signal: request.signal,
    },
  );

  if (!response.ok || response.body === null) {
    const message = await readBackendError(response);
    return NextResponse.json({ error: message }, { status: response.status || 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
    },
  });
}

function isAgentStreamRequest(value: unknown): value is AgentStreamRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "chatId" in value &&
    (typeof value.chatId === "string" || value.chatId === null) &&
    "projectId" in value &&
    (typeof value.projectId === "string" || value.projectId === null) &&
    "message" in value &&
    typeof value.message === "string" &&
    value.message.trim().length > 0
  );
}

async function readBackendError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message) && body.message.every((item) => typeof item === "string")) {
        return body.message.join(" ");
      }
    }
  } catch {
    return `Agent backend returned ${response.status}.`;
  }
  return `Agent backend returned ${response.status}.`;
}
