import { Injectable } from "@nestjs/common";
import type { DataSource } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  IntegrationConnectionEntity,
  WorkspaceIntegrationEntity,
} from "../persistence/entities/index.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the secret provider value at runtime.
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the OAuth client value at runtime.
import { GoogleDriveOAuthClient, GoogleDriveOAuthError } from "./google-drive-oauth.client.js";
import { hasRequiredGoogleDriveScopes } from "./plugins/google-drive.integration-plugin.js";

const googleDrivePluginKey = "google-drive";
const reconnectMessage =
  "Google Drive authorization expired or was revoked. Reconnect Google Drive to resume synchronization.";

export const googleDriveAccessErrorCodes = [
  "connection_not_available",
  "credentials_not_available",
  "database_not_configured",
  "integration_not_connected",
  "integration_not_found",
  "oauth_failed",
  "scope_missing",
] as const;

export type GoogleDriveAccessErrorCode = (typeof googleDriveAccessErrorCodes)[number];

export type GoogleDriveAccessGrant = {
  accessToken: string;
  connectionId: string;
  expiresInSeconds: number;
};

export type GoogleDriveConnectionContext = {
  connectionId: string;
  secretReference: string;
  scopes: readonly string[];
};

export class GoogleDriveAccessError extends Error {
  constructor(
    readonly code: GoogleDriveAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "GoogleDriveAccessError";
  }
}

@Injectable()
export class GoogleDriveAccessService {
  private initialization: Promise<DataSource> | null = null;

  constructor(
    private readonly dataSourceProvider: ApiDataSourceProvider,
    private readonly oauthClient: GoogleDriveOAuthClient,
    private readonly secretProvider: DatabaseIntegrationSecretProvider,
  ) {}

  async getAccessGrant(
    workspaceId: string,
    integrationId: string,
  ): Promise<GoogleDriveAccessGrant> {
    const connection = await this.getConnectedConnection(workspaceId, integrationId);
    if (!hasRequiredGoogleDriveScopes(connection.scopes)) {
      await this.markReauthorizationRequired(integrationId, connection);
      throw accessError("scope_missing", "Required Google Drive scopes are missing.");
    }
    const refreshToken = await this.secretProvider.read(connection.secretReference);
    if (refreshToken === null) {
      await this.markReauthorizationRequired(integrationId, connection);
      throw accessError("credentials_not_available", "Google Drive credentials are unavailable.");
    }
    try {
      const grant = await this.oauthClient.refreshAccessToken(refreshToken);
      if (!hasRequiredGoogleDriveScopes(grant.scopes)) {
        await this.markReauthorizationRequired(integrationId, connection);
        throw accessError("scope_missing", "Required Google Drive scopes are missing.");
      }
      return {
        accessToken: grant.accessToken,
        connectionId: connection.connectionId,
        expiresInSeconds: grant.expiresInSeconds,
      };
    } catch (error: unknown) {
      if (error instanceof GoogleDriveAccessError) throw error;
      if (error instanceof GoogleDriveOAuthError) {
        if (error.requiresReauthorization) {
          await this.markReauthorizationRequired(integrationId, connection);
          throw accessError("oauth_failed", reconnectMessage);
        }
        throw accessError("oauth_failed", "Google Drive credentials could not be refreshed.");
      }
      throw error;
    }
  }

  private async markReauthorizationRequired(
    integrationId: string,
    connection: GoogleDriveConnectionContext,
  ): Promise<void> {
    const dataSource = await this.getInitializedDataSource();
    await dataSource.transaction(async (manager) => {
      const integrationRepository = manager.getRepository(WorkspaceIntegrationEntity);
      const integration = await integrationRepository
        .createQueryBuilder("integration")
        .where("integration.id = :integrationId", { integrationId })
        .setLock("pessimistic_write")
        .getOne();
      if (integration?.status !== "connected") return;
      const updated = await manager.getRepository(IntegrationConnectionEntity).update(
        {
          id: connection.connectionId,
          secretReference: connection.secretReference,
          status: "connected",
          workspaceIntegrationId: integrationId,
        },
        { lastError: reconnectMessage, status: "error" },
      );
      // A successful reconnect may have replaced the credentials while refresh was in flight.
      if (updated.affected !== 1) return;
      integration.status = "error";
      integration.lastError = reconnectMessage;
      await integrationRepository.save(integration);
    });
  }

  async getConnectedConnection(
    workspaceId: string,
    integrationId: string,
  ): Promise<GoogleDriveConnectionContext> {
    const dataSource = await this.getInitializedDataSource();
    const integration = await dataSource
      .getRepository(WorkspaceIntegrationEntity)
      .findOneBy({ id: integrationId, workspaceId });
    if (integration === null || integration.pluginKey !== googleDrivePluginKey) {
      throw accessError("integration_not_found", "Google Drive integration was not found.");
    }
    if (integration.status !== "connected") {
      throw accessError("integration_not_connected", "Google Drive integration is not connected.");
    }
    const connection = await dataSource.getRepository(IntegrationConnectionEntity).findOneBy({
      status: "connected",
      workspaceIntegrationId: integration.id,
    });
    if (connection === null) {
      throw accessError("connection_not_available", "Google Drive connection is unavailable.");
    }
    return {
      connectionId: connection.id,
      scopes: connection.scopes,
      secretReference: connection.secretReference,
    };
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) {
      throw accessError("database_not_configured", "Database is not configured.");
    }
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

function accessError(code: GoogleDriveAccessErrorCode, message: string): GoogleDriveAccessError {
  return new GoogleDriveAccessError(code, message);
}
