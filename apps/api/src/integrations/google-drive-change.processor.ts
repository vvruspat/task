import { Inject, Injectable } from "@nestjs/common";
import { GoogleDriveAccessService } from "./google-drive-access.service.js";
import type { GoogleDriveChangeStore } from "./google-drive-change.store.js";
import { GoogleDriveChangesClient } from "./google-drive-changes.client.js";
import type {
  GoogleDriveWatchStore,
  GoogleDriveWatchSubscription,
} from "./google-drive-watch.contracts.js";
import { TypeOrmGoogleDriveChangeStore } from "./typeorm-google-drive-change.store.js";
import { TypeOrmGoogleDriveWatchStore } from "./typeorm-google-drive-watch.store.js";

const maximumPagesPerDelivery = 100;

type GoogleDriveChangeAccess = Pick<GoogleDriveAccessService, "getAccessGrant">;
type GoogleDriveChangeClient = Pick<GoogleDriveChangesClient, "listChanges">;
type GoogleDriveCursorStore = Pick<GoogleDriveWatchStore, "updateCursor">;

export type GoogleDriveChangeProcessingResult = {
  eventsRecorded: number;
  pagesProcessed: number;
  superseded: boolean;
};

@Injectable()
export class GoogleDriveChangeProcessor {
  constructor(
    @Inject(GoogleDriveAccessService)
    private readonly accessService: GoogleDriveChangeAccess,
    @Inject(GoogleDriveChangesClient)
    private readonly client: GoogleDriveChangeClient,
    @Inject(TypeOrmGoogleDriveChangeStore)
    private readonly changeStore: GoogleDriveChangeStore,
    @Inject(TypeOrmGoogleDriveWatchStore)
    private readonly cursorStore: GoogleDriveCursorStore,
  ) {}

  async process(
    subscription: GoogleDriveWatchSubscription,
    syncedAt = new Date(),
  ): Promise<GoogleDriveChangeProcessingResult> {
    const access = await this.accessService.getAccessGrant(
      subscription.workspaceId,
      subscription.installationId,
    );
    if (access.connectionId !== subscription.connectionId) {
      throw new Error("Google Drive change watch no longer matches its connection.");
    }
    let cursor = subscription.providerCursor;
    let eventsRecorded = 0;
    for (let pagesProcessed = 1; pagesProcessed <= maximumPagesPerDelivery; pagesProcessed += 1) {
      const page = await this.client.listChanges(access.accessToken, cursor);
      eventsRecorded += await this.changeStore.recordChanges({
        changes: page.changes,
        connectionId: subscription.connectionId,
        syncedAt,
        workspaceId: subscription.workspaceId,
      });
      const nextCursor = page.nextPageToken ?? page.newStartPageToken;
      if (nextCursor === null)
        throw new Error("Google Drive change page has no continuation cursor.");
      const advanced = await this.cursorStore.updateCursor(subscription.id, cursor, nextCursor);
      if (!advanced) return { eventsRecorded, pagesProcessed, superseded: true };
      if (page.nextPageToken === null) {
        return { eventsRecorded, pagesProcessed, superseded: false };
      }
      cursor = page.nextPageToken;
    }
    throw new Error("Google Drive change delivery exceeded the page processing limit.");
  }
}
