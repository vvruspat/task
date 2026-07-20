import { NextResponse } from "next/server";

const apiBaseUrl = process.env["TASK_API_BASE_URL"] ?? "http://localhost:3000";
const trustedUserId = process.env["TASK_USER_ID"];

type AgentMessage = { role: "assistant" | "user"; content: string };
type AgentStreamRequest = {
  workspaceId: string;
  projectId: string | null;
  messages: AgentMessage[];
};

export async function POST(request: Request): Promise<Response> {
  if (trustedUserId === undefined || trustedUserId.trim().length === 0) {
    return NextResponse.json({ error: "TASK_USER_ID is not configured." }, { status: 503 });
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
      body: JSON.stringify({ messages: body.messages, projectId: body.projectId }),
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
    "projectId" in value &&
    (typeof value.projectId === "string" || value.projectId === null) &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.length > 0 &&
    value.messages.every(isAgentMessage)
  );
}

function isAgentMessage(value: unknown): value is AgentMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    (value.role === "assistant" || value.role === "user") &&
    "content" in value &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
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
