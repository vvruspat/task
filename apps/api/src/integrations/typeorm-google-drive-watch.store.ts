import { Injectable } from "@nestjs/common";
import { type DataSource, In, LessThanOrEqual } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationSubscriptionEntity,
  WorkspaceIntegrationEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the secret provider value at runtime.
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
import type { GoogleDriveChangeChannel } from "./google-drive-changes.client.js";
import type {
  GoogleDriveWatchStore,
  GoogleDriveWatchSubscription,
  ReserveGoogleDriveWatchInput,
  ReserveGoogleDriveWatchResult,
} from "./google-drive-watch.contracts.js";

const googleDrivePluginKey = "google-drive";
const googleDriveWatchKind = "google-drive.changes";
const watchActivationLeaseMs = 5 * 60_000;

@Injectable()
export class TypeOrmGoogleDriveWatchStore implements GoogleDriveWatchStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly secretProvider: DatabaseIntegrationSecretProvider,
  ) {}

  isConfigured(): boolean {
    return this.dataSourceProvider.getDataSource() !== null;
  }

  async findCurrent(connectionId: string): Promise<GoogleDriveWatchSubscription | null> {
    const dataSource = await this.getInitializedDataSource();
    const subscriptions = await dataSource.getRepository(IntegrationSubscriptionEntity).find({
      order: { createdAt: "DESC" },
      where: { connectionId, status: In(["active", "renewing"]) },
    });
    const subscription = subscriptions.find(isGoogleDriveWatchEntity);
    return subscription === undefined
      ? null
      : await this.toWatchSubscription(dataSource, subscription);
  }

  async findByChannelId(channelId: string): Promise<GoogleDriveWatchSubscription | null> {
    const dataSource = await this.getInitializedDataSource();
    const subscription = await dataSource.getRepository(IntegrationSubscriptionEntity).findOneBy({
      providerSubscriptionId: channelId,
      status: In(["active", "renewing"]),
    });
    return subscription === null || !isGoogleDriveWatchEntity(subscription)
      ? null
      : await this.toWatchSubscription(dataSource, subscription);
  }

  async listDue(now: Date, limit: number): Promise<readonly GoogleDriveWatchSubscription[]> {
    const dataSource = await this.getInitializedDataSource();
    const subscriptions = await dataSource.getRepository(IntegrationSubscriptionEntity).find({
      order: { renewAfter: "ASC", id: "ASC" },
      take: limit,
      where: { renewAfter: LessThanOrEqual(now), status: "active" },
    });
    const result: GoogleDriveWatchSubscription[] = [];
    for (const subscription of subscriptions) {
      if (!isGoogleDriveWatchEntity(subscription)) continue;
      result.push(await this.toWatchSubscription(dataSource, subscription));
    }
    return result;
  }

  async reserve(input: ReserveGoogleDriveWatchInput): Promise<ReserveGoogleDriveWatchResult> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const connection = await manager
        .getRepository(IntegrationConnectionEntity)
        .createQueryBuilder("connection")
        .where("connection.id = :connectionId", { connectionId: input.connectionId })
        .setLock("pessimistic_write")
        .getOne();
      if (connection === null || connection.status !== "connected") {
        throw new Error("Google Drive connection is unavailable while reserving a change watch.");
      }
      const integration = await manager.getRepository(WorkspaceIntegrationEntity).findOneBy({
        id: input.installationId,
        workspaceId: input.workspaceId,
      });
      if (
        integration === null ||
        integration.pluginKey !== googleDrivePluginKey ||
        integration.status !== "connected" ||
        connection.workspaceIntegrationId !== integration.id
      ) {
        throw new Error("Google Drive integration changed while reserving a change watch.");
      }

      const repository = manager.getRepository(IntegrationSubscriptionEntity);
      const current = await repository.find({
        order: { createdAt: "DESC" },
        where: { connectionId: connection.id, status: In(["active", "renewing"]) },
      });
      const existing = current.find((subscription) =>
        input.replacesSubscriptionId === null
          ? isGoogleDriveWatchEntity(subscription)
          : isReplacementFor(subscription, input.replacesSubscriptionId),
      );
      if (existing !== undefined) {
        const activationLeaseActive =
          existing.status === "active" ||
          existing.updatedAt.getTime() > input.reservedAt.getTime() - watchActivationLeaseMs;
        if (activationLeaseActive) {
          return {
            created: false,
            subscription: toWatchSubscription(existing, integration.workspaceId, integration.id),
          };
        }
        if (existing.callbackSecretReference !== null) {
          await this.secretProvider.deleteUsingManager(manager, existing.callbackSecretReference);
        }
        existing.callbackSecretReference = null;
        existing.lastError = "Google Drive watch activation lease expired.";
        existing.status = "error";
        await repository.save(existing);
      }

      const callbackSecretReference = await this.secretProvider.putUsingManager(
        manager,
        input.callbackToken,
      );
      const subscription = repository.create({
        callbackSecretReference,
        connectionId: connection.id,
        expiresAt: null,
        externalResourceId: null,
        lastError: null,
        lastEventAt: null,
        metadata: {
          installationId: integration.id,
          kind: googleDriveWatchKind,
          replacesSubscriptionId: input.replacesSubscriptionId,
          resourceId: null,
          resourceUri: null,
          workspaceId: integration.workspaceId,
        },
        providerCursor: input.providerCursor,
        providerSubscriptionId: input.channelId,
        renewAfter: null,
        status: "renewing",
      });
      await repository.save(subscription);
      return {
        created: true,
        subscription: toWatchSubscription(subscription, integration.workspaceId, integration.id),
      };
    });
  }

  async activate(
    subscriptionId: string,
    channel: GoogleDriveChangeChannel,
    now: Date,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(IntegrationSubscriptionEntity);
      const subscription = await repository.findOneBy({ id: subscriptionId });
      if (subscription === null)
        throw new Error(`Integration subscription ${subscriptionId} was lost.`);
      subscription.expiresAt = channel.expiration;
      subscription.lastError = null;
      subscription.metadata = {
        ...subscription.metadata,
        resourceId: channel.resourceId,
        resourceUri: channel.resourceUri,
      };
      subscription.renewAfter = renewalTimeForExpiration(now, channel.expiration);
      subscription.status = "active";
      await repository.save(subscription);
    });
  }

  async markError(subscriptionId: string, error: string): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(IntegrationSubscriptionEntity)
      .update(
        { id: subscriptionId },
        { lastError: error.slice(0, 2_000), renewAfter: null, status: "error" },
      );
  }

  async deferRenewal(subscriptionId: string, renewAfter: Date, error: string): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(IntegrationSubscriptionEntity)
      .update(
        { id: subscriptionId, status: "active" },
        { lastError: error.slice(0, 2_000), renewAfter },
      );
  }

  async markStopped(subscriptionId: string): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(IntegrationSubscriptionEntity);
      const subscription = await repository.findOneBy({ id: subscriptionId });
      if (subscription === null) return;
      if (subscription.callbackSecretReference !== null) {
        await this.secretProvider.deleteUsingManager(manager, subscription.callbackSecretReference);
      }
      subscription.callbackSecretReference = null;
      subscription.renewAfter = null;
      subscription.status = "stopped";
      await repository.save(subscription);
    });
  }

  async touchEvent(subscriptionId: string, occurredAt: Date): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource
      .getRepository(IntegrationSubscriptionEntity)
      .update({ id: subscriptionId }, { lastEventAt: occurredAt });
  }

  async updateCursor(
    subscriptionId: string,
    previousCursor: string,
    nextCursor: string,
  ): Promise<boolean> {
    const dataSource = await this.getInitializedDataSource();
    const result = await dataSource
      .getRepository(IntegrationSubscriptionEntity)
      .createQueryBuilder()
      .update()
      .set({ providerCursor: nextCursor })
      .where("id = :subscriptionId", { subscriptionId })
      .andWhere("provider_cursor = :previousCursor", { previousCursor })
      .execute();
    return result.affected === 1;
  }

  private async toWatchSubscription(
    dataSource: DataSource,
    subscription: IntegrationSubscriptionEntity,
  ): Promise<GoogleDriveWatchSubscription> {
    const connection = await dataSource.getRepository(IntegrationConnectionEntity).findOneBy({
      id: subscription.connectionId,
      status: "connected",
    });
    if (connection === null) throw new Error("Google Drive watch connection is unavailable.");
    const integration = await dataSource.getRepository(WorkspaceIntegrationEntity).findOneBy({
      id: connection.workspaceIntegrationId,
      pluginKey: googleDrivePluginKey,
      status: "connected",
    });
    if (integration === null) throw new Error("Google Drive watch integration is unavailable.");
    return toWatchSubscription(subscription, integration.workspaceId, integration.id);
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

export function renewalTimeForExpiration(now: Date, expiration: Date): Date {
  const lifetimeMs = expiration.getTime() - now.getTime();
  if (lifetimeMs <= 120_000) return new Date(now.getTime() + 60_000);
  return new Date(now.getTime() + Math.floor(lifetimeMs * 0.8));
}

function isGoogleDriveWatchEntity(subscription: IntegrationSubscriptionEntity): boolean {
  return subscription.metadata["kind"] === googleDriveWatchKind;
}

function isReplacementFor(
  subscription: IntegrationSubscriptionEntity,
  replacedSubscriptionId: string,
): boolean {
  return (
    isGoogleDriveWatchEntity(subscription) &&
    subscription.metadata["replacesSubscriptionId"] === replacedSubscriptionId
  );
}

function toWatchSubscription(
  subscription: IntegrationSubscriptionEntity,
  workspaceId: string,
  installationId: string,
): GoogleDriveWatchSubscription {
  if (subscription.callbackSecretReference === null || subscription.providerCursor === null) {
    throw new Error(`Google Drive watch ${subscription.id} has incomplete credentials or cursor.`);
  }
  const resourceId = subscription.metadata["resourceId"];
  return {
    callbackSecretReference: subscription.callbackSecretReference,
    channelId: subscription.providerSubscriptionId,
    connectionId: subscription.connectionId,
    expiresAt: subscription.expiresAt,
    id: subscription.id,
    installationId,
    providerCursor: subscription.providerCursor,
    renewAfter: subscription.renewAfter,
    resourceId: typeof resourceId === "string" ? resourceId : null,
    status: subscription.status === "active" ? "active" : "renewing",
    workspaceId,
  };
}
