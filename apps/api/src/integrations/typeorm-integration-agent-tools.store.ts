import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, In } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  ConnectedAgentToolInstallation,
  IntegrationAgentToolsStore,
} from "./integration-agent-tools.store.js";

@Injectable()
export class TypeOrmIntegrationAgentToolsStore implements IntegrationAgentToolsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listConnected(
    workspaceId: string,
    userId: string,
  ): Promise<readonly ConnectedAgentToolInstallation[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await dataSource
      .getRepository(WorkspaceMemberEntity)
      .findOneBy({ userId, workspaceId });
    if (membership === null || membership.role === "guest") return null;
    const integrations = await dataSource.getRepository(WorkspaceIntegrationEntity).find({
      order: { pluginKey: "ASC" },
      where: { status: "connected", workspaceId },
    });
    if (integrations.length === 0) return [];
    const connections = await dataSource.getRepository(IntegrationConnectionEntity).findBy({
      status: "connected",
      workspaceIntegrationId: In(integrations.map((integration) => integration.id)),
    });
    const connectedIntegrationIds = new Set(
      connections.map((connection) => connection.workspaceIntegrationId),
    );
    return integrations.flatMap((integration) =>
      connectedIntegrationIds.has(integration.id)
        ? [
            {
              installationId: integration.id,
              pluginKey: integration.pluginKey,
              pluginVersion: integration.pluginVersion,
              workspaceId: integration.workspaceId,
            },
          ]
        : [],
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
