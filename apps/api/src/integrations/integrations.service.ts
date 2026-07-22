import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import { IntegrationCatalogItemDto, WorkspaceIntegrationDto } from "./integrations.dto.js";
import type { WorkspaceIntegrationsStore } from "./integrations.store.js";

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly store: WorkspaceIntegrationsStore,
    private readonly registry: IntegrationPluginRegistry,
  ) {}

  async listCatalog(workspaceId: string, userId: string): Promise<IntegrationCatalogItemDto[]> {
    const installations = await this.store.listForManager(workspaceId, userId);
    if (installations === null) {
      throw new ForbiddenException("Current user cannot manage workspace integrations.");
    }
    const installationByPluginKey = new Map(
      installations.map((installation) => [installation.pluginKey, installation]),
    );
    return this.registry
      .list()
      .map(
        (plugin) =>
          new IntegrationCatalogItemDto(
            plugin,
            installationByPluginKey.get(plugin.manifest.pluginKey) ?? null,
          ),
      );
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
