import type { GoogleDriveChange } from "./google-drive-changes.client.js";

export type RecordGoogleDriveChangesInput = {
  changes: readonly GoogleDriveChange[];
  connectionId: string;
  syncedAt: Date;
  workspaceId: string;
};

export interface GoogleDriveChangeStore {
  recordChanges(input: RecordGoogleDriveChangesInput): Promise<number>;
}
