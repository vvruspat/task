import { timingSafeEqual } from "node:crypto";
import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
import { GoogleDriveChangeProcessor } from "./google-drive-change.processor.js";
import type { GoogleDriveWatchStore } from "./google-drive-watch.contracts.js";
import type { GoogleDriveWebhookNotification } from "./google-drive-webhook.contracts.js";
import type { GoogleDriveWebhookStore } from "./google-drive-webhook.store.js";
import { TypeOrmGoogleDriveWatchStore } from "./typeorm-google-drive-watch.store.js";
import { TypeOrmGoogleDriveWebhookStore } from "./typeorm-google-drive-webhook.store.js";

type GoogleDriveWebhookSecrets = Pick<DatabaseIntegrationSecretProvider, "read">;
type GoogleDriveWebhookProcessor = Pick<GoogleDriveChangeProcessor, "process">;
type GoogleDriveWebhookWatchStore = Pick<GoogleDriveWatchStore, "findByChannelId" | "touchEvent">;

@Injectable()
export class GoogleDriveWebhookService {
  constructor(
    @Inject(TypeOrmGoogleDriveWatchStore)
    private readonly watchStore: GoogleDriveWebhookWatchStore,
    @Inject(DatabaseIntegrationSecretProvider)
    private readonly secretProvider: GoogleDriveWebhookSecrets,
    @Inject(TypeOrmGoogleDriveWebhookStore)
    private readonly webhookStore: GoogleDriveWebhookStore,
    @Inject(GoogleDriveChangeProcessor)
    private readonly processor: GoogleDriveWebhookProcessor,
  ) {}

  async receive(
    notification: GoogleDriveWebhookNotification,
    receivedAt = new Date(),
  ): Promise<void> {
    const subscription = await this.watchStore.findByChannelId(notification.channelId);
    if (subscription === null) throw new ForbiddenException("Unknown Google Drive channel.");
    const expectedToken = await this.secretProvider.read(subscription.callbackSecretReference);
    if (expectedToken === null || !securelyEqual(expectedToken, notification.channelToken)) {
      throw new ForbiddenException("Invalid Google Drive channel token.");
    }
    if (subscription.resourceId !== null && subscription.resourceId !== notification.resourceId) {
      throw new ForbiddenException("Invalid Google Drive channel resource.");
    }
    const receipt = await this.webhookStore.record(subscription, notification, receivedAt);
    if (receipt.status === "processed" || receipt.status === "ignored") return;
    if (!(await this.webhookStore.claim(receipt.id))) {
      throw new ServiceUnavailableException("Google Drive change processing is already active.");
    }
    try {
      await this.watchStore.touchEvent(subscription.id, receivedAt);
      if (notification.resourceState === "change") {
        await this.processor.process(subscription, receivedAt);
        await this.webhookStore.complete(receipt.id, "processed", new Date());
        return;
      }
      await this.webhookStore.complete(receipt.id, "ignored", new Date());
    } catch (error: unknown) {
      await this.webhookStore.fail(receipt.id, formatWebhookError(error));
      throw new ServiceUnavailableException("Google Drive change processing failed.");
    }
  }
}

export function securelyEqual(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return (
    expectedBuffer.byteLength === receivedBuffer.byteLength &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function formatWebhookError(error: unknown): string {
  return (
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown webhook error"
  ).slice(0, 2_000);
}
