"use client";

import type { NotificationFeed } from "@task/api-client";
import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { LatestRequestCoordinator } from "./latest-request";
import { isNotificationFeed } from "./notifications";
import { workspaceRealtimeEvent } from "./use-workspace-data";

type NotificationDataState = {
  error: string | null;
  feed: NotificationFeed | null;
  loading: boolean;
  workspaceId: string | null;
};

type NotificationDataStore = NotificationDataState & {
  replace: (state: NotificationDataState) => void;
};

const notificationRequestCoordinator = new LatestRequestCoordinator<string, NotificationFeed>();
const useNotificationDataStore = create<NotificationDataStore>()((set) => ({
  error: null,
  feed: null,
  loading: false,
  replace: (state): void => set(state),
  workspaceId: null,
}));

export function useNotificationsController(
  workspaceId: string | null,
  markRead: boolean,
  fallbackError: string,
): void {
  const load = useCallback(
    async (shouldMarkRead: boolean): Promise<void> => {
      if (workspaceId === null) {
        resetNotificationData();
        return;
      }
      const current = useNotificationDataStore.getState();
      if (current.workspaceId !== workspaceId) {
        current.replace({ error: null, feed: null, loading: true, workspaceId });
      }
      const request = notificationRequestCoordinator.request(
        `${workspaceId}:${shouldMarkRead ? "read" : "feed"}`,
        (signal) => requestNotificationFeed(workspaceId, shouldMarkRead, fallbackError, signal),
      );
      try {
        const feed = await request.promise;
        if (!notificationRequestCoordinator.isLatest(request)) return;
        useNotificationDataStore.getState().replace({
          error: null,
          feed,
          loading: false,
          workspaceId,
        });
      } catch (error: unknown) {
        if (!notificationRequestCoordinator.isLatest(request) || request.signal.aborted) return;
        const latest = useNotificationDataStore.getState();
        latest.replace({
          error: error instanceof Error ? error.message : fallbackError,
          feed: latest.workspaceId === workspaceId ? latest.feed : null,
          loading: false,
          workspaceId,
        });
      }
    },
    [fallbackError, workspaceId],
  );

  useEffect(() => {
    void load(markRead);
  }, [load, markRead]);
  useEffect(() => {
    const revalidate = (): void => void load(false);
    window.addEventListener(workspaceRealtimeEvent, revalidate);
    return () => window.removeEventListener(workspaceRealtimeEvent, revalidate);
  }, [load]);
}

export function useNotificationFeed(): NotificationDataState {
  const error = useNotificationDataStore((state) => state.error);
  const feed = useNotificationDataStore((state) => state.feed);
  const loading = useNotificationDataStore((state) => state.loading);
  const workspaceId = useNotificationDataStore((state) => state.workspaceId);
  return { error, feed, loading, workspaceId };
}

export function useNotificationUnreadCount(workspaceId: string | null): number {
  return useNotificationDataStore((state) =>
    state.workspaceId === workspaceId ? (state.feed?.unreadCount ?? 0) : 0,
  );
}

export function resetNotificationData(): void {
  notificationRequestCoordinator.cancel();
  useNotificationDataStore.getState().replace({
    error: null,
    feed: null,
    loading: false,
    workspaceId: null,
  });
}

async function requestNotificationFeed(
  workspaceId: string,
  markRead: boolean,
  fallbackError: string,
  signal: AbortSignal,
): Promise<NotificationFeed> {
  const response = await fetch(
    `/api/workspace/notifications?workspaceId=${encodeURIComponent(workspaceId)}`,
    { cache: "no-store", method: markRead ? "POST" : "GET", signal },
  );
  const value: unknown = await response.json();
  if (!response.ok || !isNotificationFeed(value)) {
    throw new Error(readNotificationError(value, fallbackError));
  }
  return value;
}

function readNotificationError(value: unknown, fallback: string): string {
  return typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}
