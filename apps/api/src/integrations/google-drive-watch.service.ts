import { randomBytes, randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import { GoogleDriveAccessService } from "./google-drive-access.service.js";
import { GoogleDriveChangesClient } from "./google-drive-changes.client.js";
import type {
  GoogleDriveWatchStore,
  GoogleDriveWatchSubscription,
} from "./google-drive-watch.contracts.js";
import { IntegrationsConfigProvider } from "./integrations.config.js";
import { TypeOrmGoogleDriveWatchStore } from "./typeorm-google-drive-watch.store.js";

const googleDrivePluginKey = "google-drive";
const requestedChannelLifetimeMs = 6 * 24 * 60 * 60_000;
const renewalRetryDelayMs = 15 * 60_000;

type GoogleDriveWatchAccess = Pick<GoogleDriveAccessService, "getAccessGrant">;
type GoogleDriveWatchClient = Pick<
  GoogleDriveChangesClient,
  "getStartPageToken" | "stopChannel" | "watchChanges"
>;
type GoogleDriveWatchConfiguration = Pick<IntegrationsConfigProvider, "getConfig">;

@Injectable()
export class GoogleDriveWatchService {
  constructor(
    @Inject(GoogleDriveAccessService)
    private readonly accessService: GoogleDriveWatchAccess,
    @Inject(GoogleDriveChangesClient)
    private readonly changesClient: GoogleDriveWatchClient,
    @Inject(TypeOrmGoogleDriveWatchStore)
    private readonly store: GoogleDriveWatchStore,
    @Inject(IntegrationsConfigProvider)
    private readonly configProvider: GoogleDriveWatchConfiguration,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (handlerContext.pluginKey !== googleDrivePluginKey) {
      throw new Error(`Unexpected integration plugin ${handlerContext.pluginKey}.`);
    }
    if (
      event.name !== "integration.connected.v1" ||
      event.entity.type !== "workspace_integration" ||
      event.entity.id !== handlerContext.installationId ||
      event.payload["configuration"] !== "rootFolder"
    ) {
      return;
    }
    if (this.configProvider.getConfig().googleDriveWebhook === null) return;
    const access = await this.accessService.getAccessGrant(
      event.workspaceId,
      handlerContext.installationId,
    );
    const current = await this.store.findCurrent(access.connectionId);
    if (current?.status === "active") return;
    const cursor =
      current?.providerCursor ?? (await this.changesClient.getStartPageToken(access.accessToken));
    const ready = await this.createWatch(
      {
        accessToken: access.accessToken,
        connectionId: access.connectionId,
        installationId: handlerContext.installationId,
        workspaceId: event.workspaceId,
      },
      cursor,
      null,
      new Date(),
    );
    if (!ready) throw new Error("Google Drive change watch is still being activated.");
  }

  async renew(subscription: GoogleDriveWatchSubscription, now = new Date()): Promise<void> {
    if (this.configProvider.getConfig().googleDriveWebhook === null) return;
    const access = await this.accessService.getAccessGrant(
      subscription.workspaceId,
      subscription.installationId,
    );
    try {
      const replacementReady = await this.createWatch(
        {
          accessToken: access.accessToken,
          connectionId: access.connectionId,
          installationId: subscription.installationId,
          workspaceId: subscription.workspaceId,
        },
        subscription.providerCursor,
        subscription.id,
        now,
      );
      if (!replacementReady) {
        await this.store.deferRenewal(
          subscription.id,
          new Date(now.getTime() + renewalRetryDelayMs),
          "Google Drive replacement watch is still being activated.",
        );
        return;
      }
    } catch (error: unknown) {
      await this.store.deferRenewal(
        subscription.id,
        new Date(now.getTime() + renewalRetryDelayMs),
        formatWatchError(error),
      );
      throw error;
    }

    if (subscription.resourceId === null) {
      await this.store.markError(
        subscription.id,
        "Google Drive watch has no provider resource ID.",
      );
      return;
    }
    try {
      await this.changesClient.stopChannel(
        access.accessToken,
        subscription.channelId,
        subscription.resourceId,
      );
      await this.store.markStopped(subscription.id);
    } catch (error: unknown) {
      await this.store.markError(subscription.id, formatWatchError(error));
    }
  }

  private async createWatch(
    context: {
      accessToken: string;
      connectionId: string;
      installationId: string;
      workspaceId: string;
    },
    providerCursor: string,
    replacesSubscriptionId: string | null,
    now: Date,
  ): Promise<boolean> {
    const webhookConfig = this.configProvider.getConfig().googleDriveWebhook;
    if (webhookConfig === null) return false;
    const callbackToken = randomBytes(32).toString("base64url");
    const channelId = randomUUID();
    const reserved = await this.store.reserve({
      callbackToken,
      channelId,
      connectionId: context.connectionId,
      installationId: context.installationId,
      providerCursor,
      replacesSubscriptionId,
      reservedAt: now,
      workspaceId: context.workspaceId,
    });
    if (!reserved.created) return reserved.subscription.status === "active";
    try {
      const channel = await this.changesClient.watchChanges(context.accessToken, {
        callbackUrl: webhookConfig.callbackUrl,
        channelId,
        channelToken: callbackToken,
        expiresAt: new Date(now.getTime() + requestedChannelLifetimeMs),
        pageToken: providerCursor,
      });
      await this.store.activate(reserved.subscription.id, channel, now);
      return true;
    } catch (error: unknown) {
      await this.store.markError(reserved.subscription.id, formatWatchError(error));
      throw error;
    }
  }
}

export function formatWatchError(error: unknown): string {
  return (
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown Drive watch error"
  ).slice(0, 2_000);
}
