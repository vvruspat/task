import { randomUUID } from "node:crypto";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { IntegrationDomainEventName, IntegrationPlugin } from "@task/integration-sdk";
import { type DataSource, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationEventDeliveryEntity,
  IntegrationOutboxEventEntity,
  WorkspaceIntegrationEntity,
} from "../persistence/entities/index.js";
import type {
  ClaimedIntegrationDelivery,
  IntegrationOutboxEvent,
} from "./integration-outbox.contracts.js";
import type {
  ClaimIntegrationDeliveriesInput,
  CompleteIntegrationDeliveryInput,
  FailIntegrationDeliveryInput,
  IntegrationOutboxStore,
} from "./integration-outbox.store.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the registry value at runtime.
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";

@Injectable()
export class TypeOrmIntegrationOutboxStore implements IntegrationOutboxStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly registry: IntegrationPluginRegistry,
  ) {}

  isConfigured(): boolean {
    return this.dataSourceProvider.getDataSource() !== null;
  }

  async fanOutPending(batchSize: number, publishedAt: Date): Promise<number> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const eventRepository = manager.getRepository(IntegrationOutboxEventEntity);
      const events = await eventRepository
        .createQueryBuilder("event")
        .where("event.publishedAt IS NULL")
        .orderBy("event.occurredAt", "ASC")
        .addOrderBy("event.id", "ASC")
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .take(batchSize)
        .getMany();
      if (events.length === 0) return 0;

      let deliveryCount = 0;
      for (const event of events) {
        const installations = await manager.getRepository(WorkspaceIntegrationEntity).find({
          order: { id: "ASC" },
          where: { status: "connected", workspaceId: event.workspaceId },
        });
        const deliveries = installations.flatMap((installation) => {
          const plugin = this.registry.get(installation.pluginKey);
          if (plugin === null || !pluginConsumesEvent(plugin, event.eventName)) return [];
          return [
            manager.getRepository(IntegrationEventDeliveryEntity).create({
              availableAt: publishedAt,
              outboxEventId: event.id,
              pluginKey: installation.pluginKey,
              pluginVersion: installation.pluginVersion,
              workspaceIntegrationId: installation.id,
            }),
          ];
        });
        if (deliveries.length > 0) {
          await manager
            .getRepository(IntegrationEventDeliveryEntity)
            .createQueryBuilder()
            .insert()
            .values(deliveries)
            .orIgnore()
            .execute();
          deliveryCount += deliveries.length;
        }
        event.publishedAt = publishedAt;
      }
      await eventRepository.save(events);
      return deliveryCount;
    });
  }

  async claimPending(
    input: ClaimIntegrationDeliveriesInput,
  ): Promise<ClaimedIntegrationDelivery[]> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      const staleBefore = new Date(input.claimedAt.getTime() - input.leaseDurationMs);
      const deliveryRepository = manager.getRepository(IntegrationEventDeliveryEntity);
      const deliveries = await deliveryRepository
        .createQueryBuilder("delivery")
        .where(
          `(delivery.status = :pendingStatus AND delivery.availableAt <= :claimedAt)
          OR (delivery.status = :processingStatus AND delivery.lockedAt <= :staleBefore)`,
          {
            claimedAt: input.claimedAt,
            pendingStatus: "pending",
            processingStatus: "processing",
            staleBefore,
          },
        )
        .orderBy("delivery.availableAt", "ASC")
        .addOrderBy("delivery.id", "ASC")
        .setLock("pessimistic_write")
        .setOnLocked("skip_locked")
        .take(input.batchSize)
        .getMany();
      if (deliveries.length === 0) return [];

      for (const delivery of deliveries) {
        delivery.attemptCount += 1;
        delivery.lockedAt = input.claimedAt;
        delivery.lockToken = randomUUID();
        delivery.status = "processing";
      }
      await deliveryRepository.save(deliveries);

      const events = await manager.getRepository(IntegrationOutboxEventEntity).findBy({
        id: In([...new Set(deliveries.map((delivery) => delivery.outboxEventId))]),
      });
      const eventsById = new Map(events.map((event) => [event.id, event]));
      return deliveries.map((delivery) => {
        const event = eventsById.get(delivery.outboxEventId);
        if (event === undefined) {
          throw new Error(`Integration outbox event ${delivery.outboxEventId} was not found.`);
        }
        const lockToken = delivery.lockToken;
        if (lockToken === null) {
          throw new Error(`Integration delivery ${delivery.id} was claimed without a lock token.`);
        }
        return {
          delivery: { ...delivery, lockToken },
          event: toDomainEvent(event),
        };
      });
    });
  }

  async complete(input: CompleteIntegrationDeliveryInput): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.getRepository(IntegrationEventDeliveryEntity).update(
      { id: input.deliveryId, lockToken: input.lockToken, status: "processing" },
      {
        lastError: null,
        lockedAt: null,
        lockToken: null,
        processedAt: input.processedAt,
        status: "succeeded",
      },
    );
  }

  async fail(input: FailIntegrationDeliveryInput): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.getRepository(IntegrationEventDeliveryEntity).update(
      { id: input.deliveryId, lockToken: input.lockToken, status: "processing" },
      {
        availableAt: input.retryAt ?? new Date(),
        lastError: input.error,
        lockedAt: null,
        lockToken: null,
        status: input.retryAt === null ? "dead" : "pending",
      },
    );
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
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

export function pluginConsumesEvent(
  plugin: IntegrationPlugin,
  eventName: IntegrationDomainEventName,
): boolean {
  return plugin.manifest.capabilities.some(
    (capability) =>
      capability.kind === "domain_event_consumer" && capability.eventNames.includes(eventName),
  );
}

function toDomainEvent(event: IntegrationOutboxEvent): ClaimedIntegrationDelivery["event"] {
  return {
    actorUserId: event.actorUserId,
    entity: { id: event.entityId, type: event.entityType },
    id: event.id,
    name: event.eventName,
    occurredAt: event.occurredAt.toISOString(),
    payload: event.payload,
    workspaceId: event.workspaceId,
  };
}
