import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { IntegrationDomainEvent } from "@task/integration-sdk";
import type { DataSource, EntityManager } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import { IntegrationOutboxEventEntity } from "../persistence/entities/index.js";

@Injectable()
export class IntegrationOutboxPublisher {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async publish(event: IntegrationDomainEvent): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => this.publishUsingManager(manager, event));
  }

  async publishUsingManager(manager: EntityManager, event: IntegrationDomainEvent): Promise<void> {
    const occurredAt = parseIntegrationEventOccurredAt(event);
    await manager
      .getRepository(IntegrationOutboxEventEntity)
      .createQueryBuilder()
      .insert()
      .values({
        actorUserId: event.actorUserId,
        entityId: event.entity.id,
        entityType: event.entity.type,
        eventName: event.name,
        id: event.id,
        occurredAt,
        payload: () => "CAST(:payload AS jsonb)",
        workspaceId: event.workspaceId,
      })
      .setParameter("payload", JSON.stringify(event.payload))
      .orIgnore()
      .execute();
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

export function parseIntegrationEventOccurredAt(event: IntegrationDomainEvent): Date {
  const occurredAt = new Date(event.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error(`Integration domain event ${event.id} has an invalid occurredAt value.`);
  }
  return occurredAt;
}
