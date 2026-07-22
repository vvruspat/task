import assert from "node:assert/strict";
import test from "node:test";
import { GoogleDriveChangeProcessor } from "./google-drive-change.processor.js";
import type { GoogleDriveChangeStore } from "./google-drive-change.store.js";
import type { GoogleDriveChangePage } from "./google-drive-changes.client.js";
import type { GoogleDriveWatchSubscription } from "./google-drive-watch.contracts.js";

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

test("Google Drive change processing persists every page and advances the durable cursor", async () => {
  const pages = new Map<string, GoogleDriveChangePage>([
    [
      "cursor-1",
      {
        changes: [],
        newStartPageToken: null,
        nextPageToken: "cursor-2",
      },
    ],
    [
      "cursor-2",
      {
        changes: [],
        newStartPageToken: "cursor-3",
        nextPageToken: null,
      },
    ],
  ]);
  const recordedCursors: string[] = [];
  const changeStore: GoogleDriveChangeStore = {
    async recordChanges(): Promise<number> {
      return 2;
    },
  };
  const processor = new GoogleDriveChangeProcessor(
    {
      async getAccessGrant(): Promise<{
        accessToken: string;
        connectionId: string;
        expiresInSeconds: number;
      }> {
        return {
          accessToken: "access-token",
          connectionId: subscription.connectionId,
          expiresInSeconds: 3_600,
        };
      },
    },
    {
      async listChanges(_accessToken: string, cursor: string): Promise<GoogleDriveChangePage> {
        const page = pages.get(cursor);
        if (page === undefined) throw new Error(`Unexpected cursor ${cursor}.`);
        return page;
      },
    },
    changeStore,
    {
      async updateCursor(
        _subscriptionId: string,
        previous: string,
        next: string,
      ): Promise<boolean> {
        recordedCursors.push(`${previous}:${next}`);
        return true;
      },
    },
  );

  assert.deepEqual(await processor.process(subscription), {
    eventsRecorded: 4,
    pagesProcessed: 2,
    superseded: false,
  });
  assert.deepEqual(recordedCursors, ["cursor-1:cursor-2", "cursor-2:cursor-3"]);
});
