import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import type { WorkspaceIntegrationHealth } from "./integrations.contracts.js";
import { IntegrationCatalogItemDto, WorkspaceIntegrationDto } from "./integrations.dto.js";
import type {
  WorkspaceIntegrationOperationalSnapshot,
  WorkspaceIntegrationsStore,
} from "./integrations.store.js";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly store: WorkspaceIntegrationsStore,
    private readonly registry: IntegrationPluginRegistry,
  ) {}

  async listCatalog(workspaceId: string, userId: string): Promise<IntegrationCatalogItemDto[]> {
    const snapshots = await this.store.listForManager(workspaceId, userId);
    if (snapshots === null) {
      throw new ForbiddenException("Current user cannot manage workspace integrations.");
    }
    const snapshotByPluginKey = new Map(
      snapshots.map((snapshot) => [snapshot.integration.pluginKey, snapshot]),
    );
    const checkedAt = new Date();
    return this.registry.list().map((plugin) => {
      const snapshot = snapshotByPluginKey.get(plugin.manifest.pluginKey) ?? null;
      return new IntegrationCatalogItemDto(
        plugin,
        snapshot?.integration ?? null,
        snapshot === null ? null : evaluateIntegrationHealth(snapshot, checkedAt),
      );
    });
  }

  async install(
    workspaceId: string,
    pluginKey: string,
    userId: string,
  ): Promise<WorkspaceIntegrationDto> {
    const plugin = this.registry.get(pluginKey);
    if (plugin === null) throw new NotFoundException("Integration plugin was not found.");
    const result = await this.store.install(
      workspaceId,
      userId,
      plugin.manifest.pluginKey,
      plugin.manifest.pluginVersion,
    );
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot install workspace integrations.");
    }
    return new WorkspaceIntegrationDto(result.integration);
  }

  async uninstall(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<WorkspaceIntegrationDto> {
    const result = await this.store.uninstall(workspaceId, integrationId, userId);
    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot uninstall workspace integrations.");
    }
    if (result.status === "integration_not_found") {
      throw new NotFoundException("Workspace integration was not found.");
    }
    if (result.status === "integration_connected") {
      throw new ConflictException("Connected workspace integration must be disconnected first.");
    }
    return new WorkspaceIntegrationDto(result.integration);
  }
}

export function evaluateIntegrationHealth(
  snapshot: WorkspaceIntegrationOperationalSnapshot,
  checkedAt: Date,
): WorkspaceIntegrationHealth {
  const connection: WorkspaceIntegrationHealth["connection"] = snapshot.connection ?? {
    lastError: null,
    status: "missing",
  };
  const hasPipelineFailure =
    snapshot.subscriptions.expiredCount > 0 ||
    snapshot.subscriptions.errorCount > 0 ||
    snapshot.deliveries.deadCount > 0 ||
    snapshot.webhooks.failedCount > 0;

  let status: WorkspaceIntegrationHealth["status"];
  if (
    snapshot.integration.status === "authorizing" ||
    snapshot.integration.status === "disconnected"
  ) {
    status = "inactive";
  } else if (
    snapshot.integration.status === "error" ||
    connection.status === "missing" ||
    connection.status === "disconnected" ||
    connection.status === "error"
  ) {
    status = "error";
  } else if (hasPipelineFailure) {
    status = "degraded";
  } else {
    status = "healthy";
  }

  return {
    checkedAt,
    connection,
    deliveries: snapshot.deliveries,
    status,
    subscriptions: snapshot.subscriptions,
    webhooks: snapshot.webhooks,
  };
}
