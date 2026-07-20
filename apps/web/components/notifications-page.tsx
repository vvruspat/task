"use client";

import { Avatar, Badge, Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { NotificationFeed, NotificationItem } from "@task/api-client";
import { AtSign, Bell, CircleDot } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { isNotificationFeed, notificationsReadEvent } from "../lib/notifications";
import { formatActivityTime } from "../lib/task-activity";
import { useWorkspaceData, workspaceRealtimeEvent } from "../lib/use-workspace-data";
import { workspaceIssueHref } from "../lib/workspace-url";

export function NotificationsPage(): ReactNode {
  const workspace = useWorkspaceData().data?.workspace;
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(
    async (markRead: boolean): Promise<void> => {
      if (workspace === undefined) return;
      try {
        const response = await fetch(
          `/api/workspace/notifications?workspaceId=${encodeURIComponent(workspace.id)}`,
          {
            cache: "no-store",
            method: markRead ? "POST" : "GET",
          },
        );
        const value: unknown = await response.json();
        if (!response.ok || !isNotificationFeed(value)) throw new Error(readError(value));
        setFeed(value);
        setError(null);
        if (markRead) window.dispatchEvent(new Event(notificationsReadEvent));
      } catch (loadError: unknown) {
        setError(
          loadError instanceof Error ? loadError.message : "Не удалось загрузить уведомления.",
        );
      }
    },
    [workspace],
  );

  useEffect(() => {
    void load(true);
  }, [load]);
  useEffect(() => {
    const reload = (): void => {
      void load(false);
    };
    window.addEventListener(workspaceRealtimeEvent, reload);
    return () => window.removeEventListener(workspaceRealtimeEvent, reload);
  }, [load]);

  return (
    <Box className="notifications-page">
      <Flex align="center" justify="between">
        <Box>
          <Heading as="h1" size="7">
            Уведомления
          </Heading>
          <Text color="gray" size="3">
            Изменения подписанных задач и упоминания
          </Text>
        </Box>
        {feed !== null && <Badge color="gray">{feed.items.length}</Badge>}
      </Flex>
      {feed === null && error === null && <Text color="gray">Загружаю…</Text>}
      {error !== null && <Text color="red">{error}</Text>}
      {feed !== null && feed.items.length === 0 && (
        <Flex className="notifications-empty" align="center" direction="column" gap="3">
          <Bell size={28} />
          <Heading as="h2" size="4">
            Пока тихо
          </Heading>
          <Text color="gray">Подпишитесь на задачу или дождитесь упоминания.</Text>
        </Flex>
      )}
      <Flex className="notification-list" direction="column">
        {feed?.items.map((item) => (
          <NotificationRow item={item} key={item.id} workspaceSlug={workspace?.slug ?? ""} />
        ))}
      </Flex>
    </Box>
  );
}

function NotificationRow({
  item,
  workspaceSlug,
}: Readonly<{ item: NotificationItem; workspaceSlug: string }>): ReactNode {
  const actor = item.actorDisplayName ?? "Система";
  return (
    <Link
      className={item.read ? "notification-row" : "notification-row unread"}
      href={workspaceIssueHref(workspaceSlug, item.projectKey, item.taskNumber, item.taskTitle)}
    >
      <Avatar
        fallback={item.kind === "mention" ? <AtSign size={15} /> : <CircleDot size={15} />}
        size="2"
      />
      <Flex className="notification-copy" direction="column" gap="1">
        <Text size="2">
          <strong>{actor}</strong> {notificationMessage(item)}
        </Text>
        <Text color="gray" size="2">
          {item.projectKey}-{item.taskNumber} · {item.taskTitle}
        </Text>
      </Flex>
      <Text color="gray" size="1">
        {formatActivityTime(item.createdAt)}
      </Text>
    </Link>
  );
}

function notificationMessage(item: NotificationItem): string {
  if (item.kind === "mention") return "упомянул(а) вас в комментарии";
  if (item.eventType === "task.status_changed") return "изменил(а) статус задачи";
  if (item.eventType === "task.assignee_changed") return "изменил(а) исполнителя";
  if (item.eventType === "comment.created") return "добавил(а) комментарий";
  if (item.eventType === "attachment.created") return "добавил(а) вложение";
  return "изменил(а) задачу";
}

function readError(value: unknown): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : "Не удалось загрузить уведомления.";
}
