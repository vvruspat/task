import assert from "node:assert/strict";
import test from "node:test";
import type { GoogleDriveChangeChannel } from "./google-drive-changes.client.js";
import type {
  GoogleDriveWatchStore,
  GoogleDriveWatchSubscription,
} from "./google-drive-watch.contracts.js";
import { GoogleDriveWatchService } from "./google-drive-watch.service.js";
import type { IntegrationsConfig } from "./integrations.config.js";

const oldSubscription: GoogleDriveWatchSubscription = {
  callbackSecretReference: "old-secret-reference",
  channelId: "old-channel",
  connectionId: "00000000-0000-4000-8000-000000000001",
  expiresAt: new Date("2026-07-28T12:00:00.000Z"),
  id: "00000000-0000-4000-8000-000000000002",
  installationId: "00000000-0000-4000-8000-000000000003",
  providerCursor: "cursor-1",
  renewAfter: new Date("2026-07-27T07:12:00.000Z"),
  resourceId: "old-resource",
  status: "active",
  workspaceId: "00000000-0000-4000-8000-000000000004",
};

test("Drive renewal keeps the old channel while a reserved replacement is still activating", async () => {
  let deferred = 0;
  let stopped = 0;
  const replacement: GoogleDriveWatchSubscription = {
    ...oldSubscription,
    channelId: "replacement-channel",
    id: "00000000-0000-4000-8000-000000000005",
    resourceId: null,
    status: "renewing",
  };
  const store: GoogleDriveWatchStore = {
    async activate(): Promise<void> {},
    async deferRenewal(): Promise<void> {
      deferred += 1;
    },
    async findByChannelId(): Promise<GoogleDriveWatchSubscription | null> {
      return null;
    },
    async findCurrent(): Promise<GoogleDriveWatchSubscription | null> {
      return oldSubscription;
    },
    isConfigured(): boolean {
      return true;
    },
    async listDue(): Promise<readonly GoogleDriveWatchSubscription[]> {
      return [];
    },
    async markError(): Promise<void> {},
    async markStopped(): Promise<void> {},
    async reserve(): Promise<{ created: false; subscription: GoogleDriveWatchSubscription }> {
      return { created: false, subscription: replacement };
    },
    async touchEvent(): Promise<void> {},
    async updateCursor(): Promise<boolean> {
      return true;
    },
  };
  const config: IntegrationsConfig = {
    attachmentContent: { maxBytes: 1024, storageRoot: null },
    googleDrive: null,
    googleDrivePicker: null,
    googleDriveWebhook: {
      callbackUrl: "https://task.example.com/api/integrations/webhooks/google-drive",
    },
    secretEncryptionKey: null,
  };
  const service = new GoogleDriveWatchService(
    {
      async getAccessGrant(): Promise<{
        accessToken: string;
        connectionId: string;
        expiresInSeconds: number;
      }> {
        return {
          accessToken: "access-token",
          connectionId: oldSubscription.connectionId,
          expiresInSeconds: 3_600,
        };
      },
    },
    {
      async getStartPageToken(): Promise<string> {
        return "cursor-1";
      },
      async stopChannel(): Promise<void> {
        stopped += 1;
      },
      async watchChanges(): Promise<GoogleDriveChangeChannel> {
        throw new Error("A previously reserved replacement must not be recreated.");
      },
    },
    store,
    {
      getConfig(): IntegrationsConfig {
        return config;
      },
    },
  );

  await service.renew(oldSubscription, new Date("2026-07-27T07:12:00.000Z"));

  assert.equal(deferred, 1);
  assert.equal(stopped, 0);
});
