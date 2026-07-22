import { Injectable } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { IntegrationWebhookReceiptEntity } from "../persistence/entities/index.js";
import type { GoogleDriveWatchSubscription } from "./google-drive-watch.contracts.js";
import {
  type GoogleDriveWebhookNotification,
  safeGoogleDriveWebhookHeaders,
} from "./google-drive-webhook.contracts.js";
import type {
  CompletedGoogleDriveWebhookStatus,
  GoogleDriveWebhookStore,
} from "./google-drive-webhook.store.js";
import type { IntegrationWebhookReceipt } from "./integration-webhook.contracts.js";

const googleDrivePluginKey = "google-drive";

@Injectable()
export class TypeOrmGoogleDriveWebhookStore implements GoogleDriveWebhookStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async record(
    subscription: GoogleDriveWatchSubscription,
    notification: GoogleDriveWebhookNotification,
    receivedAt: Date,
  ): Promise<IntegrationWebhookReceipt> {
    const dataSource = await this.getInitializedDataSource();
    const repository = dataSource.getRepository(IntegrationWebhookReceiptEntity);
    const providerEventId = `${notification.channelId}:${notification.messageNumber}`;
    const receipt = repository.create({
      attemptCount: 0,
      connectionId: subscription.connectionId,
      eventType: notification.resourceState,
      headers: safeGoogleDriveWebhookHeaders(notification),
      lastError: null,
      payload: {},
      pluginKey: googleDrivePluginKey,
      processedAt: null,
      providerEventId,
      receivedAt,
      status: "received",
      subscriptionId: subscription.id,
      workspaceIntegrationId: subscription.installationId,
    });
    await dataSource.query(
      `INSERT INTO "integration_webhook_receipts" ("id", "plugin_key", "workspace_integration_id", "connection_id", "subscription_id", "provider_event_id", "event_type", "status", "attempt_count", "headers", "payload", "received_at", "processed_at", "last_error", "created_at", "updated_at") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $12, $12) ON CONFLICT ("plugin_key", "provider_event_id") DO NOTHING`,
      [
        receipt.id,
        receipt.pluginKey,
        receipt.workspaceIntegrationId,
        receipt.connectionId,
        receipt.subscriptionId,
        receipt.providerEventId,
        receipt.eventType,
        receipt.status,
        receipt.attemptCount,
        JSON.stringify(receipt.headers),
        JSON.stringify(receipt.payload),
        receipt.receivedAt,
        receipt.processedAt,
        receipt.lastError,
      ],
    );
    const stored = await repository.findOneBy({ pluginKey: googleDrivePluginKey, providerEventId });
    if (stored === null) throw new Error("Google Drive webhook receipt could not be persisted.");
    return stored;
  }

  async claim(receiptId: string): Promise<boolean> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource
      .getRepository(IntegrationWebhookReceiptEntity)
      .createQueryBuilder()
      .update()
      .set({
        attemptCount: () => '"attempt_count" + 1',
        lastError: null,
        processedAt: null,
        status: "processing",
        updatedAt: () => "CURRENT_TIMESTAMP",
      })
      .where("id = :receiptId", { receiptId })
      .andWhere(
        `(status IN (:...claimableStatuses) OR (status = 'processing' AND updated_at <= CURRENT_TIMESTAMP - INTERVAL '5 minutes'))`,
        {
          claimableStatuses: ["received", "failed"],
        },
      )
      .execute();
    return result.affected === 1;
  }

  async complete(
    receiptId: string,
    status: CompletedGoogleDriveWebhookStatus,
    processedAt: Date,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(IntegrationWebhookReceiptEntity)
      .update({ id: receiptId, status: "processing" }, { processedAt, status });
  }

  async fail(receiptId: string, error: string): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(IntegrationWebhookReceiptEntity)
      .update(
        { id: receiptId, status: "processing" },
        { lastError: error.slice(0, 2_000), status: "failed" },
      );
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new Error("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}
