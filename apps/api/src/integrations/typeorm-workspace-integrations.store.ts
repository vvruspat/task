import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  WorkspaceIntegrationEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceIntegration } from "./integrations.contracts.js";
import type {
  InstallWorkspaceIntegrationResult,
  UninstallWorkspaceIntegrationResult,
  WorkspaceIntegrationsStore,
} from "./integrations.store.js";

@Injectable()
export class TypeOrmWorkspaceIntegrationsStore implements WorkspaceIntegrationsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listForManager(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceIntegration[] | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await isWorkspaceManager(dataSource.manager, workspaceId, userId))) return null;
    return await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .find({ order: { createdAt: "ASC" }, where: { workspaceId } });
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
