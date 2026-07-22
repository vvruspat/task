import { Injectable } from "@nestjs/common";
import type { ClaimedIntegrationDelivery } from "./integration-outbox.contracts.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the registry value at runtime.
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";

@Injectable()
export class IntegrationEventDispatcher {
  constructor(private readonly registry: IntegrationPluginRegistry) {}

  async dispatch(claimed: ClaimedIntegrationDelivery): Promise<void> {
    const { delivery, event } = claimed;
    const plugin = this.registry.get(delivery.pluginKey);
    if (plugin === null) {
      throw new Error(`Integration plugin ${delivery.pluginKey} is not registered.`);
    }
    if (plugin.manifest.pluginVersion !== delivery.pluginVersion) {
      throw new Error(
        `Integration plugin ${delivery.pluginKey} version ${delivery.pluginVersion} is not available.`,
      );
    }
    const handler = plugin.handlers?.handleDomainEvent;
    if (handler === undefined) {
      throw new Error(`Integration plugin ${delivery.pluginKey} has no domain event handler.`);
    }
    await handler(event, {
      attempt: delivery.attemptCount,
      idempotencyKey: `${event.id}:${delivery.workspaceIntegrationId}`,
      installationId: delivery.workspaceIntegrationId,
      pluginKey: delivery.pluginKey,
      pluginVersion: delivery.pluginVersion,
    });
  }
}
