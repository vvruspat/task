"use client";

import "./agent-chat.css";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, IconButton } from "@radix-ui/themes";
import { Bot, Send, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useWorkspaceData } from "../lib/use-workspace-data";
import { useWorkspaceStore } from "../lib/workspace-store";

type AgentChatMessage = { role: "assistant" | "user"; content: string };
type AgentStreamEvent =
  | { type: "text-delta"; delta: string }
  | { type: "done"; agentRunId: string; status: string };

export function AgentPage(): ReactNode {
  return (
    <div className="agent-page">
      <AgentChat />
    </div>
  );
}

export function AgentDrawer(): ReactNode {
  const open = useWorkspaceStore((state) => state.agentOpen);
  const setOpen = useWorkspaceStore((state) => state.setAgentOpen);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="agent-drawer-overlay" />
        <Dialog.Content className="agent-drawer">
          <div className="agent-drawer-title">
            <Dialog.Title>Agent</Dialog.Title>
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              aria-label="Закрыть агента"
              onClick={() => setOpen(false)}
            >
              <X size={18} />
            </IconButton>
          </div>
          <AgentChat />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AgentChat(): ReactNode {
  const data = useWorkspaceData().data;
  const projectId = useWorkspaceStore((state) => state.selectedProjectId);
  const workspaceId = data?.workspace.id ?? null;
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        if (workspaceId === null) throw new Error("Рабочее пространство ещё не загружено.");
        const requestMessages = messages.flatMap((message): AgentChatMessage[] => {
          if (message.role !== "assistant" && message.role !== "user") return [];
          const content = message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("\n")
            .trim();
          return content.length === 0 ? [] : [{ role: message.role, content }];
        });
        let text = "";
        for await (const event of streamAgentResponse(
          { workspaceId, projectId, messages: requestMessages },
          abortSignal,
        )) {
          if (event.type === "text-delta") {
            text += event.delta;
            yield { content: [{ type: "text", text }] };
          }
        }
      },
    }),
    [workspaceId, projectId],
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="agent-thread">
        <ThreadPrimitive.Viewport className="agent-thread-viewport">
          <ThreadPrimitive.Empty>
            <div className="agent-empty">
              <span>
                <Sparkles size={22} />
              </span>
              <h2>Чем помочь с проектом?</h2>
              <p>Можно создавать задачи, уточнять статус работы и запускать операции агента.</p>
            </div>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
          <div className="agent-composer-wrap">
            <ComposerPrimitive.Root className="agent-composer">
              <ComposerPrimitive.Input
                className="agent-composer-input"
                placeholder="Напишите агенту…"
              />
              <ComposerPrimitive.Send asChild>
                <Button aria-label="Отправить" size="2">
                  <Send size={16} />
                </Button>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
            <small>Enter — отправить · Shift+Enter — новая строка</small>
          </div>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="agent-message agent-message-user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="agent-message agent-message-assistant">
      <span className="agent-message-icon">
        <Bot size={15} />
      </span>
      <div>
        <MessagePrimitive.Parts />
        <MessagePrimitive.Error>
          <p className="agent-message-error">Не удалось получить ответ агента.</p>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

async function* streamAgentResponse(
  input: { workspaceId: string; projectId: string | null; messages: AgentChatMessage[] },
  signal: AbortSignal,
): AsyncGenerator<AgentStreamEvent> {
  const response = await fetch("/api/agent/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok || response.body === null) throw new Error(await readAgentError(response));

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    buffer += decoder.decode(result.value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = parseAgentStreamFrame(frame);
      if (event !== null) yield event;
    }
  }
  buffer += decoder.decode();
  if (buffer.trim().length > 0) {
    const event = parseAgentStreamFrame(buffer);
    if (event !== null) yield event;
  }
}

function parseAgentStreamFrame(frame: string): AgentStreamEvent | null {
  const data = frame
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice(6);
  if (data === undefined) return null;
  try {
    const value: unknown = JSON.parse(data);
    if (typeof value !== "object" || value === null || !("type" in value)) return null;
    if (value.type === "text-delta" && "delta" in value && typeof value.delta === "string") {
      return { type: "text-delta", delta: value.delta };
    }
    if (
      value.type === "done" &&
      "agentRunId" in value &&
      typeof value.agentRunId === "string" &&
      "status" in value &&
      typeof value.status === "string"
    ) {
      return { type: "done", agentRunId: value.agentRunId, status: value.status };
    }
  } catch {
    return null;
  }
  return null;
}

async function readAgentError(response: Response): Promise<string> {
  try {
    const value: unknown = await response.json();
    if (
      typeof value === "object" &&
      value !== null &&
      "error" in value &&
      typeof value.error === "string"
    )
      return value.error;
  } catch {
    return `Agent request failed with status ${response.status}.`;
  }
  return `Agent request failed with status ${response.status}.`;
}
