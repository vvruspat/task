import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, type EntityManager, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  IntegrationEventDeliveryEntity,
  IntegrationSubscriptionEntity,
  IntegrationWebhookReceiptEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceIntegration } from "./integrations.contracts.js";
import type {
  InstallWorkspaceIntegrationResult,
  UninstallWorkspaceIntegrationResult,
  WorkspaceIntegrationOperationalSnapshot,
  WorkspaceIntegrationsStore,
} from "./integrations.store.js";

type IntegrationStatusCountRow = {
  integrationId: string;
  status: string;
  count: string;
};

@Injectable()
export class TypeOrmWorkspaceIntegrationsStore implements WorkspaceIntegrationsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForManager(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceIntegrationOperationalSnapshot[] | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await isWorkspaceManager(dataSource.manager, workspaceId, userId))) return null;
    const integrations = await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .find({ order: { createdAt: "ASC" }, where: { workspaceId } });
    if (integrations.length === 0) return [];

    const integrationIds = integrations.map((integration) => integration.id);
    const [connections, subscriptionCounts, deliveryCounts, webhookCounts] = await Promise.all([
      dataSource.getRepository(IntegrationConnectionEntity).find({
        where: { workspaceIntegrationId: In(integrationIds) },
      }),
      dataSource
        .getRepository(IntegrationSubscriptionEntity)
        .createQueryBuilder("subscription")
        .innerJoin(
          IntegrationConnectionEntity,
          "connection",
          "connection.id = subscription.connectionId",
        )
        .select("connection.workspaceIntegrationId", "integrationId")
        .addSelect("subscription.status", "status")
        .addSelect("COUNT(*)", "count")
        .where("connection.workspaceIntegrationId IN (:...integrationIds)", { integrationIds })
        .groupBy("connection.workspaceIntegrationId")
        .addGroupBy("subscription.status")
        .getRawMany<IntegrationStatusCountRow>(),
      countByInstallationAndStatus(
        dataSource,
        IntegrationEventDeliveryEntity,
        "delivery",
        integrationIds,
      ),
      countByInstallationAndStatus(
        dataSource,
        IntegrationWebhookReceiptEntity,
        "webhook",
        integrationIds,
      ),
    ]);

    const connectionByIntegrationId = new Map(
      connections.map((connection) => [connection.workspaceIntegrationId, connection]),
    );
    const snapshots = new Map(
      integrations.map((integration) => [
        integration.id,
        createOperationalSnapshot(integration, connectionByIntegrationId.get(integration.id)),
      ]),
    );
    applySubscriptionCounts(snapshots, subscriptionCounts);
    applyDeliveryCounts(snapshots, deliveryCounts);
    applyWebhookCounts(snapshots, webhookCounts);
    return integrations.map((integration) => {
      const snapshot = snapshots.get(integration.id);
      if (snapshot === undefined) {
        throw new Error(`Integration health snapshot ${integration.id} was not initialized.`);
      }
      return snapshot;
    });
  }

  async install(
    workspaceId: string,
    userId: string,
    pluginKey: string,
    pluginVersion: string,
  ): Promise<InstallWorkspaceIntegrationResult> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      if (!(await isWorkspaceManager(manager, workspaceId, userId))) {
        return { status: "forbidden" };
      }
      const repository = manager.getRepository(WorkspaceIntegrationEntity);
      const existing = await repository.findOneBy({ pluginKey, workspaceId });
      if (existing !== null) return { integration: existing, status: "already_installed" };
      const integration = repository.create({
        installedByUserId: userId,
        pluginKey,
        pluginVersion,
        status: "disconnected",
        workspaceId,
      });
      await repository.save(integration);
      return { integration, status: "installed" };
    });
  }

  async uninstall(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<UninstallWorkspaceIntegrationResult> {
    const dataSource = await this.getInitializedDataSource();
    return await dataSource.transaction(async (manager) => {
      if (!(await isWorkspaceManager(manager, workspaceId, userId))) {
        return { status: "forbidden" };
      }
      const repository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await repository.findOneBy({ id: integrationId, workspaceId });
      if (integration === null) return { status: "integration_not_found" };
      if (integration.status !== "disconnected") return { status: "integration_connected" };
      await repository.remove(integration);
      return { integration, status: "uninstalled" };
    });
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

async function countByInstallationAndStatus(
  dataSource: DataSource,
  entity: typeof IntegrationEventDeliveryEntity | typeof IntegrationWebhookReceiptEntity,
  alias: "delivery" | "webhook",
  integrationIds: string[],
): Promise<IntegrationStatusCountRow[]> {
  return await dataSource
    .getRepository(entity)
    .createQueryBuilder(alias)
    .select(`${alias}.workspaceIntegrationId`, "integrationId")
    .addSelect(`${alias}.status`, "status")
    .addSelect("COUNT(*)", "count")
    .where(`${alias}.workspaceIntegrationId IN (:...integrationIds)`, { integrationIds })
    .groupBy(`${alias}.workspaceIntegrationId`)
    .addGroupBy(`${alias}.status`)
    .getRawMany<IntegrationStatusCountRow>();
}

function createOperationalSnapshot(
  integration: WorkspaceIntegration,
  connection: IntegrationConnectionEntity | undefined,
): WorkspaceIntegrationOperationalSnapshot {
  return {
    connection:
      connection === undefined
        ? null
        : { lastError: connection.lastError, status: connection.status },
    deliveries: {
      deadCount: 0,
      pendingCount: 0,
      processingCount: 0,
      succeededCount: 0,
    },
    integration,
    subscriptions: {
      activeCount: 0,
      errorCount: 0,
      expiredCount: 0,
      renewingCount: 0,
      stoppedCount: 0,
    },
    webhooks: {
      failedCount: 0,
      ignoredCount: 0,
      processedCount: 0,
      processingCount: 0,
      receivedCount: 0,
    },
  };
}

function applySubscriptionCounts(
  snapshots: Map<string, WorkspaceIntegrationOperationalSnapshot>,
  rows: IntegrationStatusCountRow[],
): void {
  for (const row of rows) {
    const counts = snapshots.get(row.integrationId)?.subscriptions;
    if (counts === undefined) continue;
    const count = parseAggregateCount(row.count);
    if (row.status === "active") counts.activeCount = count;
    else if (row.status === "renewing") counts.renewingCount = count;
    else if (row.status === "expired") counts.expiredCount = count;
    else if (row.status === "error") counts.errorCount = count;
    else if (row.status === "stopped") counts.stoppedCount = count;
  }
}

function applyDeliveryCounts(
  snapshots: Map<string, WorkspaceIntegrationOperationalSnapshot>,
  rows: IntegrationStatusCountRow[],
): void {
  for (const row of rows) {
    const counts = snapshots.get(row.integrationId)?.deliveries;
    if (counts === undefined) continue;
    const count = parseAggregateCount(row.count);
    if (row.status === "pending") counts.pendingCount = count;
    else if (row.status === "processing") counts.processingCount = count;
    else if (row.status === "succeeded") counts.succeededCount = count;
    else if (row.status === "dead") counts.deadCount = count;
  }
}

function applyWebhookCounts(
  snapshots: Map<string, WorkspaceIntegrationOperationalSnapshot>,
  rows: IntegrationStatusCountRow[],
): void {
  for (const row of rows) {
    const counts = snapshots.get(row.integrationId)?.webhooks;
    if (counts === undefined) continue;
    const count = parseAggregateCount(row.count);
    if (row.status === "received") counts.receivedCount = count;
    else if (row.status === "processing") counts.processingCount = count;
    else if (row.status === "processed") counts.processedCount = count;
    else if (row.status === "ignored") counts.ignoredCount = count;
    else if (row.status === "failed") counts.failedCount = count;
  }
}

function parseAggregateCount(value: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error("Integration health query returned an invalid count.");
  }
  return count;
}

async function isWorkspaceManager(
  manager: EntityManager,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const membership = await manager
    .getRepository(WorkspaceMemberEntity)
    .findOneBy({ userId, workspaceId });
  return membership?.role === "owner" || membership?.role === "admin";
}
