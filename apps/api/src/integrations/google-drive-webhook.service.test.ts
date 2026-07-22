import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenException } from "@nestjs/common";
import type { GoogleDriveWatchSubscription } from "./google-drive-watch.contracts.js";
import type { GoogleDriveWebhookNotification } from "./google-drive-webhook.contracts.js";
import { GoogleDriveWebhookService, securelyEqual } from "./google-drive-webhook.service.js";
import type { GoogleDriveWebhookStore } from "./google-drive-webhook.store.js";
import type { IntegrationWebhookReceipt } from "./integration-webhook.contracts.js";

const callbackToken = "a".repeat(43);
const subscription: GoogleDriveWatchSubscription = {
  callbackSecretReference: "secret-reference",
  channelId: "channel-id",
  connectionId: "00000000-0000-4000-8000-000000000001",
  expiresAt: new Date("2026-07-28T12:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000002",
  installationId: "00000000-0000-4000-8000-000000000003",
  providerCursor: "cursor-1",
  renewAfter: new Date("2026-07-27T07:12:00.000Z"),
  resourceId: "resource-id",
  status: "active",
  workspaceId: "00000000-0000-4000-8000-000000000004",
};
const notification: GoogleDriveWebhookNotification = {
  channelId: subscription.channelId,
  channelToken: callbackToken,
  changed: null,
  expiration: null,
  messageNumber: "42",
  resourceId: "resource-id",
  resourceState: "change",
  resourceUri: "https://www.googleapis.com/drive/v3/changes",
};

test("verified Google Drive deliveries are processed once and recorded durably", async () => {
  let processed = 0;
  let touched = 0;
  let status: IntegrationWebhookReceipt["status"] = "received";
  const webhookStore = createWebhookStore(
    () => status,
    (nextStatus) => {
      status = nextStatus;
    },
  );
  const service = new GoogleDriveWebhookService(
    {
      async findByChannelId(): Promise<GoogleDriveWatchSubscription> {
        return subscription;
      },
      async touchEvent(): Promise<void> {
        touched += 1;
      },
    },
    {
      async read(): Promise<string> {
        return callbackToken;
      },
    },
    webhookStore,
    {
      async process(): Promise<{
        eventsRecorded: number;
        pagesProcessed: number;
        superseded: boolean;
      }> {
        processed += 1;
        return { eventsRecorded: 1, pagesProcessed: 1, superseded: false };
      },
    },
  );

  await service.receive(notification);
  await service.receive(notification);

  assert.equal(status, "processed");
  assert.equal(processed, 1);
  assert.equal(touched, 1);
});

test("Google Drive deliveries reject a spoofed callback token before recording", async () => {
  const service = new GoogleDriveWebhookService(
    {
      async findByChannelId(): Promise<GoogleDriveWatchSubscription> {
        return subscription;
      },
      async touchEvent(): Promise<void> {},
    },
    {
      async read(): Promise<string> {
        return callbackToken;
      },
    },
    createWebhookStore(
      () => "received",
      () => undefined,
    ),
    {
      async process(): Promise<{
        eventsRecorded: number;
        pagesProcessed: number;
        superseded: boolean;
      }> {
        return { eventsRecorded: 0, pagesProcessed: 0, superseded: false };
      },
    },
  );

  await assert.rejects(
    service.receive({ ...notification, channelToken: "b".repeat(43) }),
    ForbiddenException,
  );
  assert.equal(securelyEqual(callbackToken, `${callbackToken}x`), false);
});

function createWebhookStore(
  readStatus: () => IntegrationWebhookReceipt["status"],
  writeStatus: (status: IntegrationWebhookReceipt["status"]) => void,
): GoogleDriveWebhookStore {
  return {
    async claim(): Promise<boolean> {
      if (readStatus() !== "received" && readStatus() !== "failed") return false;
      writeStatus("processing");
      return true;
    },
    async complete(_receiptId, nextStatus): Promise<void> {
      writeStatus(nextStatus);
    },
    async fail(): Promise<void> {
      writeStatus("failed");
    },
    async record(): Promise<IntegrationWebhookReceipt> {
      const now = new Date("2026-07-22T12:00:00.000Z");
      return {
        attemptCount: 0,
        connectionId: subscription.connectionId,
        createdAt: now,
        eventType: notification.resourceState,
        headers: {},
        id: "00000000-0000-4000-8000-000000000005",
        lastError: null,
        payload: {},
        pluginKey: "google-drive",
        processedAt: null,
        providerEventId: `${notification.channelId}:${notification.messageNumber}`,
        receivedAt: now,
        status: readStatus(),
        subscriptionId: subscription.id,
        updatedAt: now,
        workspaceIntegrationId: subscription.installationId,
      };
    },
  };
}
