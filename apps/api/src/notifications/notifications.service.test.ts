import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { NotificationFeed } from "./notifications.contracts.js";
import { NotificationsService } from "./notifications.service.js";
import type { NotificationsStore, SubscriptionMutationResult } from "./notifications.store.js";

const feed: NotificationFeed = {
  items: [],
  lastReadAt: null,
  unreadCount: 0,
};

test("NotificationsService returns a typed feed and marks it read", async () => {
  const store = new StubNotificationsStore();
  const service = new NotificationsService(store);
  assert.deepEqual({ ...(await service.list("workspace", "user")) }, feed);
  assert.deepEqual({ ...(await service.markAllRead("workspace", "user")) }, feed);
  assert.equal(store.markedRead, true);
});

test("NotificationsService preserves task visibility and subscription permissions", async () => {
  const store = new StubNotificationsStore();
  const service = new NotificationsService(store);
  store.subscriptionResult = "forbidden";
  await assert.rejects(
    service.subscribe("workspace", "project", "task", "user"),
    ForbiddenException,
  );
  store.subscriptionResult = "task_not_found";
  await assert.rejects(
    service.unsubscribe("workspace", "project", "task", "user"),
    NotFoundException,
  );
  store.visibleSubscription = null;
  await assert.rejects(
    service.subscription("workspace", "project", "task", "user"),
    NotFoundException,
  );
});

class StubNotificationsStore implements NotificationsStore {
  markedRead = false;
  subscriptionResult: SubscriptionMutationResult = "ok";
  visibleSubscription: boolean | null = false;

  async list(): Promise<NotificationFeed | null> {
    return feed;
  }

  async markAllRead(): Promise<Date | null> {
    this.markedRead = true;
    return new Date();
  }

  async isSubscribed(): Promise<boolean | null> {
    return this.visibleSubscription;
  }

  async subscribe(): Promise<SubscriptionMutationResult> {
    return this.subscriptionResult;
  }

  async unsubscribe(): Promise<SubscriptionMutationResult> {
    return this.subscriptionResult;
  }
}
