"use client";

import { Avatar, Badge, Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { NotificationFeed, NotificationItem } from "@task/api-client";
import { AtSign, Bell, CircleDot, UserCheck } from "lucide-react";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import { isNotificationFeed, notificationsReadEvent } from "../lib/notifications";
import { formatActivityTime } from "../lib/task-activity";
import { useWorkspaceData, workspaceRealtimeEvent } from "../lib/use-workspace-data";
import { workspaceIssueHref } from "../lib/workspace-url";

export function NotificationsPage(): ReactNode {
  const { locale, t } = useI18n();
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
        if (!response.ok || !isNotificationFeed(value))
          throw new Error(readError(value, t("notifications.loadError")));
        setFeed(value);
        setError(null);
        if (markRead) window.dispatchEvent(new Event(notificationsReadEvent));
      } catch (loadError: unknown) {
        setError(loadError instanceof Error ? loadError.message : t("notifications.loadError"));
      }
    },
    [t, workspace],
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
            {t("notifications.title")}
          </Heading>
          <Text color="gray" size="3">
            {t("notifications.subtitle")}
          </Text>
        </Box>
        {feed !== null && <Badge color="gray">{feed.items.length}</Badge>}
      </Flex>
      {feed === null && error === null && <Text color="gray">{t("common.loading")}</Text>}
      {error !== null && <Text color="red">{error}</Text>}
      {feed !== null && feed.items.length === 0 && (
        <Flex className="notifications-empty" align="center" direction="column" gap="3">
          <Bell size={28} />
          <Heading as="h2" size="4">
            {t("notifications.emptyTitle")}
          </Heading>
          <Text color="gray">{t("notifications.emptyText")}</Text>
        </Flex>
      )}
      <Flex className="notification-list" direction="column">
        {feed?.items.map((item) => (
          <NotificationRow
            item={item}
            key={item.id}
            locale={locale}
            workspaceSlug={workspace?.slug ?? ""}
          />
        ))}
      </Flex>
    </Box>
  );
}

function NotificationRow({
  item,
  locale,
  workspaceSlug,
}: Readonly<{
  item: NotificationItem;
  locale: "en" | "ru";
  workspaceSlug: string;
}>): ReactNode {
  const { t } = useI18n();
  const actor = item.actorDisplayName ?? t("notifications.system");
  return (
    <Link
      className={item.read ? "notification-row" : "notification-row unread"}
      href={workspaceIssueHref(workspaceSlug, item.projectKey, item.taskNumber, item.taskTitle)}
    >
      <Avatar fallback={notificationIcon(item)} size="2" />
      <Flex className="notification-copy" direction="column" gap="1">
        <Text size="2">
          <strong>{actor}</strong> {notificationMessage(item, t)}
        </Text>
        <Text color="gray" size="2">
          {item.projectKey}-{item.taskNumber} · {item.taskTitle}
        </Text>
      </Flex>
      <Text color="gray" size="1">
        {formatActivityTime(item.createdAt, locale)}
      </Text>
    </Link>
  );
}

function notificationMessage(item: NotificationItem, t: ReturnType<typeof useI18n>["t"]): string {
  if (item.kind === "mention") return t("notifications.mentioned");
  if (item.kind === "task_assigned") return t("notifications.assignedToYou");
  if (item.eventType === "task.status_changed") return t("notifications.statusChanged");
  if (item.eventType === "task.assignee_changed") return t("notifications.assigneeChanged");
  if (item.eventType === "comment.created") return t("notifications.commented");
  if (item.eventType === "attachment.created") return t("notifications.attached");
  return t("notifications.taskChanged");
}

function notificationIcon(item: NotificationItem): ReactElement {
  if (item.kind === "mention") return <AtSign size={15} />;
  if (item.kind === "task_assigned") return <UserCheck size={15} />;
  return <CircleDot size={15} />;
}

function readError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
