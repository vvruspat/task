"use client";

import "./agent-chat.css";
import {
  AssistantRuntimeProvider,
  type ChatModelAdapter,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
  useMessage,
} from "@assistant-ui/react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button, DropdownMenu, IconButton, Spinner, TextField } from "@radix-ui/themes";
import type { AgentChatDetail, AgentChatSummary } from "@task/api-client";
import { MarkdownContent } from "@task/ui";
import {
  Bot,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Copy,
  LoaderCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { notifyWorkspaceDataChanged, useWorkspaceData } from "../lib/use-workspace-data";
import { useWorkspaceStore } from "../lib/workspace-store";

type AgentStreamEvent =
  | { type: "text-delta"; delta: string }
  | {
      type: "status";
      id: string;
      label: string;
      state: "running" | "complete" | "error";
    }
  | { type: "error"; message: string }
  | {
      type: "done";
      agentRunId: string;
      chatId: string;
      chatTitle: string;
      status: string;
    };

type AgentActivity = Extract<AgentStreamEvent, { type: "status" }>;

type AgentProgressContextValue = {
  activities: AgentActivity[];
  startedAt: number | null;
  completedAt: number | null;
};

const AgentProgressContext = createContext<AgentProgressContextValue>({
  activities: [],
  startedAt: null,
  completedAt: null,
});

export function AgentPage(): ReactNode {
  return (
    <div className="agent-page">
      <AgentChatSystem />
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
        <Dialog.Content className="agent-drawer" aria-describedby={undefined}>
          <Dialog.Title className="agent-visually-hidden">Чаты с агентом</Dialog.Title>
          <AgentChatSystem onClose={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AgentChatSystem({ onClose }: Readonly<{ onClose?: () => void }>): ReactNode {
  const workspaceId = useWorkspaceData().data?.workspace.id ?? null;
  const [chats, setChats] = useState<AgentChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chat, setChat] = useState<AgentChatDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);

  const loadChats = useCallback(async (): Promise<void> => {
    if (workspaceId === null) return;
    try {
      const params = new URLSearchParams({ workspaceId });
      if (query.trim().length > 0) params.set("query", query.trim());
      const response = await fetch(`/api/agent/chats?${params.toString()}`);
      if (!response.ok) throw new Error(await readAgentError(response));
      const value: unknown = await response.json();
      if (!isAgentChatSummaryArray(value)) throw new Error("Список чатов имеет неверный формат.");
      setChats(value);
      setError(null);
    } catch (loadError: unknown) {
      setError(readErrorMessage(loadError, "Не удалось загрузить чаты."));
    }
  }, [query, workspaceId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadChats(), 200);
    return () => window.clearTimeout(timeout);
  }, [loadChats]);

  useEffect(() => {
    if (workspaceId === null || selectedChatId === null) {
      setChat(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    void fetch(
      `/api/agent/chats/${encodeURIComponent(selectedChatId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(await readAgentError(response));
        const value: unknown = await response.json();
        if (!isAgentChatDetail(value)) throw new Error("Чат имеет неверный формат.");
        if (active) {
          setChat(value);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(readErrorMessage(loadError, "Не удалось открыть чат."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedChatId, workspaceId]);

  const startNewChat = (): void => {
    setSelectedChatId(null);
    setChat(null);
    setError(null);
  };

  const handleTurnDone = useCallback(
    (createdChat: { id: string; title: string }): void => {
      setSelectedChatId(createdChat.id);
      notifyWorkspaceDataChanged();
      void loadChats();
    },
    [loadChats],
  );

  const renameChat = async (chatId: string, title: string): Promise<void> => {
    if (workspaceId === null || title.trim().length === 0) return;
    const response = await fetch(
      `/api/agent/chats/${encodeURIComponent(chatId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      },
    );
    if (!response.ok) {
      setError(await readAgentError(response));
      return;
    }
    setEditingChatId(null);
    await loadChats();
    if (selectedChatId === chatId) {
      setChat((current) => (current === null ? null : { ...current, title: title.trim() }));
    }
  };

  const deleteChat = async (chatId: string): Promise<void> => {
    if (
      workspaceId === null ||
      !window.confirm("Удалить этот чат без возможности восстановления?")
    ) {
      return;
    }
    const response = await fetch(
      `/api/agent/chats/${encodeURIComponent(chatId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(await readAgentError(response));
      return;
    }
    if (selectedChatId === chatId) startNewChat();
    await loadChats();
  };

  return (
    <div className="agent-chat-system">
      <aside className="agent-chat-list">
        <div className="agent-chat-list-header">
          <div className="agent-chat-brand">
            <Bot size={18} />
            <strong>Агент</strong>
          </div>
          <IconButton
            type="button"
            variant="ghost"
            color="gray"
            aria-label="Новый чат"
            onClick={startNewChat}
          >
            <Plus size={18} />
          </IconButton>
        </div>
        <Button className="agent-new-chat" variant="soft" color="gray" onClick={startNewChat}>
          <Pencil size={15} /> Новый чат
        </Button>
        <TextField.Root
          className="agent-chat-search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Поиск по чатам"
        >
          <TextField.Slot>
            <Search size={14} />
          </TextField.Slot>
          {query.length > 0 && (
            <TextField.Slot>
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                aria-label="Очистить поиск"
                onClick={() => setQuery("")}
              >
                <X size={13} />
              </IconButton>
            </TextField.Slot>
          )}
        </TextField.Root>
        <div className="agent-chat-items">
          {chats.length === 0 && (
            <p className="agent-chat-list-empty">
              {query.length > 0 ? "Ничего не найдено" : "Пока нет чатов"}
            </p>
          )}
          {chats.map((item) => (
            <div
              key={item.id}
              className={`agent-chat-item${selectedChatId === item.id ? " is-active" : ""}`}
            >
              {editingChatId === item.id ? (
                <input
                  className="agent-chat-rename"
                  defaultValue={item.title}
                  ref={(element) => element?.focus()}
                  onBlur={(event) => {
                    if (event.currentTarget.getAttribute("data-cancelled") !== "true") {
                      void renameChat(item.id, event.currentTarget.value);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void renameChat(item.id, event.currentTarget.value);
                    if (event.key === "Escape") {
                      event.currentTarget.setAttribute("data-cancelled", "true");
                      setEditingChatId(null);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSelectedChatId(item.id);
                  }}
                  onDoubleClick={() => setEditingChatId(item.id)}
                  aria-label={`Открыть чат ${item.title}. Двойной клик — переименовать`}
                >
                  <MessageSquare size={14} />
                  <span>{item.title}</span>
                </button>
              )}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton
                    type="button"
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label={`Меню чата ${item.title}`}
                  >
                    <MoreHorizontal size={15} />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end">
                  <DropdownMenu.Item onSelect={() => setEditingChatId(item.id)}>
                    <Pencil size={14} />
                    Переименовать
                  </DropdownMenu.Item>
                  <DropdownMenu.Item color="red" onSelect={() => void deleteChat(item.id)}>
                    <Trash2 size={14} />
                    Удалить
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            </div>
          ))}
        </div>
      </aside>
      <section className="agent-conversation-panel">
        <header className="agent-conversation-header">
          <div>
            <strong>{chat?.title ?? "Новый чат"}</strong>
            <span>
              {chat === null ? "Начните разговор с агентом" : "Контекст сохраняется в этом чате"}
            </span>
          </div>
          {onClose !== undefined && (
            <IconButton
              type="button"
              variant="ghost"
              color="gray"
              aria-label="Закрыть агента"
              onClick={onClose}
            >
              <X size={18} />
            </IconButton>
          )}
        </header>
        {error !== null && <div className="agent-system-error">{error}</div>}
        {loading ? (
          <div className="agent-chat-loading">
            <Spinner size="3" />
          </div>
        ) : (
          <AgentConversation
            key={chat?.id ?? "new-chat"}
            chat={chat}
            workspaceId={workspaceId}
            onTurnDone={handleTurnDone}
          />
        )}
      </section>
    </div>
  );
}

function AgentConversation({
  chat,
  workspaceId,
  onTurnDone,
}: Readonly<{
  chat: AgentChatDetail | null;
  workspaceId: string | null;
  onTurnDone: (chat: { id: string; title: string }) => void;
}>): ReactNode {
  const projectId = useWorkspaceStore((state) => state.selectedProjectId);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        if (workspaceId === null) throw new Error("Рабочее пространство ещё не загружено.");
        const lastMessage = messages.at(-1);
        const message =
          lastMessage?.role === "user"
            ? lastMessage.content
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("\n")
                .trim()
            : "";
        if (message.length === 0) throw new Error("Сообщение пустое.");
        setActivities([]);
        setStartedAt(Date.now());
        setCompletedAt(null);
        let text = "";
        for await (const event of streamAgentResponse(
          { workspaceId, projectId, chatId: chat?.id ?? null, message },
          abortSignal,
        )) {
          if (event.type === "text-delta") {
            text += event.delta;
            yield { content: [{ type: "text", text }] };
          } else if (event.type === "status") {
            setActivities((current) => upsertAgentActivity(current, event));
            yield { content: [{ type: "text", text }] };
          } else if (event.type === "error") {
            setCompletedAt(Date.now());
            throw new Error(event.message);
          } else {
            setCompletedAt(Date.now());
            onTurnDone({ id: event.chatId, title: event.chatTitle });
          }
        }
      },
    }),
    [chat?.id, onTurnDone, projectId, workspaceId],
  );
  const initialMessages = useMemo(
    () =>
      chat?.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: new Date(message.createdAt),
      })) ?? [],
    [chat],
  );
  const runtime = useLocalRuntime(adapter, { initialMessages });

  return (
    <AgentProgressContext.Provider value={{ activities, startedAt, completedAt }}>
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="agent-thread">
          <ThreadPrimitive.Viewport className="agent-thread-viewport">
            <ThreadPrimitive.Empty>
              <div className="agent-empty">
                <span>
                  <Sparkles size={22} />
                </span>
                <h2>Чем помочь?</h2>
                <p>Создавайте задачи, уточняйте статус и продолжайте работу в отдельных чатах.</p>
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
    </AgentProgressContext.Provider>
  );
}

function upsertAgentActivity(current: AgentActivity[], next: AgentActivity): AgentActivity[] {
  const index = current.findIndex((activity) => activity.id === next.id);
  if (index === -1) return [...current, next];
  return current.map((activity, activityIndex) => (activityIndex === index ? next : activity));
}

function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="agent-message agent-message-user">
      <div className="agent-message-content">
        <MessagePrimitive.Parts />
        <MessageCopyAction />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage(): ReactNode {
  const progress = useContext(AgentProgressContext);
  const isLast = useMessage((message) => message.isLast);
  return (
    <MessagePrimitive.Root className="agent-message agent-message-assistant">
      <span className="agent-message-icon">
        <Bot size={15} />
      </span>
      <div className="agent-message-content">
        {isLast && progress.activities.length > 0 && <AgentActivityPanel {...progress} />}
        <MessagePrimitive.Parts components={{ Text: AgentMarkdownText }} />
        <MessagePrimitive.Error>
          <p className="agent-message-error">Не удалось получить ответ агента.</p>
        </MessagePrimitive.Error>
        <MessageCopyAction />
      </div>
    </MessagePrimitive.Root>
  );
}

function AgentMarkdownText({ text }: Readonly<{ text: string }>): ReactNode {
  return <MarkdownContent className="agent-artifact-markdown" value={text} />;
}

function AgentActivityPanel({
  activities,
  startedAt,
  completedAt,
}: Readonly<AgentProgressContextValue>): ReactNode {
  const [expanded, setExpanded] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const running = activities.some((activity) => activity.state === "running");

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const current = [...activities].reverse().find((activity) => activity.state === "running");
  const elapsedSeconds =
    startedAt === null ? 0 : Math.max(0, Math.round(((completedAt ?? now) - startedAt) / 1000));
  const summary =
    current?.label ??
    (activities.some((activity) => activity.state === "error") ? "Ошибка" : "Готово");

  return (
    <section className="agent-activity" aria-live="polite">
      <button
        type="button"
        className="agent-activity-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {running ? (
          <LoaderCircle className="agent-activity-spin" size={15} />
        ) : (
          <CircleCheck size={15} />
        )}
        <span>{summary}</span>
        <small>{elapsedSeconds}с</small>
        <ChevronDown className={expanded ? "is-expanded" : ""} size={15} />
      </button>
      {expanded && (
        <div className="agent-activity-list">
          {activities.map((activity) => (
            <div key={activity.id} data-state={activity.state}>
              {activity.state === "running" && (
                <LoaderCircle className="agent-activity-spin" size={14} />
              )}
              {activity.state === "complete" && <CircleCheck size={14} />}
              {activity.state === "error" && <CircleX size={14} />}
              <span>{activity.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MessageCopyAction(): ReactNode {
  const text = useMessage((message) =>
    message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n"),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copyMessage = async (): Promise<void> => {
    if (text.length === 0) return;
    await copyTextToClipboard(text);
    setCopied(true);
  };

  return (
    <div className="agent-message-actions">
      <button
        type="button"
        className="agent-message-copy"
        data-copied={copied ? "true" : undefined}
        disabled={text.length === 0}
        aria-label={copied ? "Сообщение скопировано" : "Копировать сообщение"}
        title={copied ? "Скопировано" : "Копировать сообщение"}
        onClick={() => void copyMessage()}
      >
        <span className="agent-copy-idle">
          <Copy size={14} />
        </span>
        <span className="agent-copy-done" aria-live="polite">
          <Check size={14} />
          <span className="agent-visually-hidden">Скопировано</span>
        </span>
      </button>
    </div>
  );
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (window.navigator.clipboard !== undefined) {
    try {
      await window.navigator.clipboard.writeText(text);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Не удалось скопировать сообщение.");
}

async function* streamAgentResponse(
  input: { workspaceId: string; projectId: string | null; chatId: string | null; message: string },
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
      value.type === "status" &&
      "id" in value &&
      typeof value.id === "string" &&
      "label" in value &&
      typeof value.label === "string" &&
      "state" in value &&
      (value.state === "running" || value.state === "complete" || value.state === "error")
    ) {
      return { type: "status", id: value.id, label: value.label, state: value.state };
    }
    if (value.type === "error" && "message" in value && typeof value.message === "string") {
      return { type: "error", message: value.message };
    }
    if (
      value.type === "done" &&
      "agentRunId" in value &&
      typeof value.agentRunId === "string" &&
      "chatId" in value &&
      typeof value.chatId === "string" &&
      "chatTitle" in value &&
      typeof value.chatTitle === "string" &&
      "status" in value &&
      typeof value.status === "string"
    ) {
      return {
        type: "done",
        agentRunId: value.agentRunId,
        chatId: value.chatId,
        chatTitle: value.chatTitle,
        status: value.status,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function isAgentChatSummaryArray(value: unknown): value is AgentChatSummary[] {
  return Array.isArray(value) && value.every(isAgentChatSummary);
}

function isAgentChatSummary(value: unknown): value is AgentChatSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "workspaceId" in value &&
    typeof value.workspaceId === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "string"
  );
}

function isAgentChatDetail(value: unknown): value is AgentChatDetail {
  return (
    isAgentChatSummary(value) &&
    "messages" in value &&
    Array.isArray(value.messages) &&
    value.messages.every(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "id" in message &&
        typeof message.id === "string" &&
        "role" in message &&
        (message.role === "user" || message.role === "assistant") &&
        "content" in message &&
        typeof message.content === "string" &&
        "createdAt" in message &&
        typeof message.createdAt === "string",
    )
  );
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

function readErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
