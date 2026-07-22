import type { GoogleDriveChangeChannel } from "./google-drive-changes.client.js";

export type GoogleDriveWatchSubscriptionStatus = "active" | "renewing";

export type GoogleDriveWatchSubscription = {
  callbackSecretReference: string;
  channelId: string;
  connectionId: string;
  expiresAt: Date | null;
  id: string;
  installationId: string;
  providerCursor: string;
  renewAfter: Date | null;
  resourceId: string | null;
  status: GoogleDriveWatchSubscriptionStatus;
  workspaceId: string;
};

export type ReserveGoogleDriveWatchInput = {
  callbackToken: string;
  channelId: string;
  connectionId: string;
  installationId: string;
  providerCursor: string;
  replacesSubscriptionId: string | null;
  reservedAt: Date;
  workspaceId: string;
};

export type ReserveGoogleDriveWatchResult = {
  created: boolean;
  subscription: GoogleDriveWatchSubscription;
};

export interface GoogleDriveWatchStore {
  activate(subscriptionId: string, channel: GoogleDriveChangeChannel, now: Date): Promise<void>;
  deferRenewal(subscriptionId: string, renewAfter: Date, error: string): Promise<void>;
  findByChannelId(channelId: string): Promise<GoogleDriveWatchSubscription | null>;
  findCurrent(connectionId: string): Promise<GoogleDriveWatchSubscription | null>;
  isConfigured(): boolean;
  listDue(now: Date, limit: number): Promise<readonly GoogleDriveWatchSubscription[]>;
  markError(subscriptionId: string, error: string): Promise<void>;
  markStopped(subscriptionId: string): Promise<void>;
  reserve(input: ReserveGoogleDriveWatchInput): Promise<ReserveGoogleDriveWatchResult>;
  touchEvent(subscriptionId: string, occurredAt: Date): Promise<void>;
  updateCursor(
    subscriptionId: string,
    previousCursor: string,
    nextCursor: string,
  ): Promise<boolean>;
}
