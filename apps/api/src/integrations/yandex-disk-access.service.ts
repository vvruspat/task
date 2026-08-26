import { Injectable } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  WorkspaceIntegrationEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the secret provider value at runtime.
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
import { hasRequiredYandexDiskScopes } from "./plugins/yandex-disk.integration-plugin.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the OAuth client value at runtime.
import { YandexDiskOAuthClient, YandexDiskOAuthError } from "./yandex-disk-oauth.client.js";

const yandexDiskPluginKey = "yandex-disk";

export const yandexDiskAccessErrorCodes = [
  "connection_not_available",
  "credentials_not_available",
  "database_not_configured",
  "integration_not_connected",
  "integration_not_found",
  "oauth_failed",
  "scope_missing",
] as const;

export type YandexDiskAccessErrorCode = (typeof yandexDiskAccessErrorCodes)[number];

export type YandexDiskAccessGrant = {
  accessToken: string;
  connectionId: string;
  expiresInSeconds: number;
};

export class YandexDiskAccessError extends Error {
  constructor(
    readonly code: YandexDiskAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "YandexDiskAccessError";
  }
}

@Injectable()
export class YandexDiskAccessService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly oauthClient: YandexDiskOAuthClient,
    private readonly secretProvider: DatabaseIntegrationSecretProvider,
  ) {}

  async getAccessGrant(workspaceId: string, integrationId: string): Promise<YandexDiskAccessGrant> {
    const dataSource = await this.getInitializedDataSource();
    const integration = await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .findOneBy({ id: integrationId, workspaceId });
    if (integration === null || integration.pluginKey !== yandexDiskPluginKey) {
      throw accessError("integration_not_found", "Yandex Disk integration was not found.");
    }
    if (integration.status !== "connected") {
      throw accessError("integration_not_connected", "Yandex Disk integration is not connected.");
    }
    const connection = await dataSource.getRepository(IntegrationConnectionEntity).findOneBy({
      status: "connected",
      workspaceIntegrationId: integration.id,
    });
    if (connection === null) {
      throw accessError("connection_not_available", "Yandex Disk connection is unavailable.");
    }
    if (!hasRequiredYandexDiskScopes(connection.scopes)) {
      throw accessError("scope_missing", "Required Yandex Disk scopes are missing.");
    }
    const refreshToken = await this.secretProvider.read(connection.secretReference);
    if (refreshToken === null) {
      throw accessError("credentials_not_available", "Yandex Disk credentials are unavailable.");
    }
    try {
      const grant = await this.oauthClient.refreshAccessToken(refreshToken);
      if (!hasRequiredYandexDiskScopes(grant.scopes)) {
        throw accessError("scope_missing", "Required Yandex Disk scopes are missing.");
      }
      await this.rotateRefreshToken(connection.id, connection.secretReference, grant.refreshToken);
      return {
        accessToken: grant.accessToken,
        connectionId: connection.id,
        expiresInSeconds: grant.expiresInSeconds,
      };
    } catch (error: unknown) {
      if (error instanceof YandexDiskAccessError) throw error;
      if (error instanceof YandexDiskOAuthError) {
        throw accessError("oauth_failed", "Yandex Disk credentials could not be refreshed.");
      }
      throw error;
    }
  }

  private async rotateRefreshToken(
    connectionId: string,
    previousSecretReference: string,
    refreshToken: string,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const connection = await lockConnection(manager, connectionId);
      if (connection === null || connection.secretReference !== previousSecretReference) return;
      const nextSecretReference = await this.secretProvider.putUsingManager(manager, refreshToken);
      connection.secretReference = nextSecretReference;
      await manager.getRepository(IntegrationConnectionEntity).save(connection);
      await this.secretProvider.deleteUsingManager(manager, previousSecretReference);
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null)
      throw accessError("database_not_configured", "Database is not configured.");
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

async function lockConnection(
  manager: EntityManager,
  connectionId: string,
): Promise<IntegrationConnectionEntity | null> {
  return await manager
    .getRepository(IntegrationConnectionEntity)
    .createQueryBuilder("connection")
    .where("connection.id = :connectionId", { connectionId })
    .andWhere("connection.status = :status", { status: "connected" })
    .setLock("pessimistic_write")
    .getOne();
}

function accessError(code: YandexDiskAccessErrorCode, message: string): YandexDiskAccessError {
  return new YandexDiskAccessError(code, message);
}
