import type { GoogleDriveWatchSubscription } from "./google-drive-watch.contracts.js";
import type { GoogleDriveWebhookNotification } from "./google-drive-webhook.contracts.js";
import type { IntegrationWebhookReceipt } from "./integration-webhook.contracts.js";

export type CompletedGoogleDriveWebhookStatus = "ignored" | "processed";

export interface GoogleDriveWebhookStore {
  claim(receiptId: string): Promise<boolean>;
  complete(
    receiptId: string,
    status: CompletedGoogleDriveWebhookStatus,
    processedAt: Date,
  ): Promise<void>;
  fail(receiptId: string, error: string): Promise<void>;
  record(
    subscription: GoogleDriveWatchSubscription,
    notification: GoogleDriveWebhookNotification,
    receivedAt: Date,
  ): Promise<IntegrationWebhookReceipt>;
}
