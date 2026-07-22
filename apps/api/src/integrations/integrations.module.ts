import { Module, type Provider } from "@nestjs/common";
import type { IntegrationPlugin } from "@task/integration-sdk";
import { BotSharedSecretGuard } from "../auth/bot-shared-secret.guard.js";
import { DatabaseModule } from "../database/database.module.js";
import { DatabaseIntegrationSecretProvider } from "./database-integration-secret.provider.js";
import { GoogleDriveClient } from "./google-drive.client.js";
import { GoogleDriveAccessService } from "./google-drive-access.service.js";
import { GoogleDriveOAuthClient } from "./google-drive-oauth.client.js";
import {
  GoogleDriveOAuthCallbackController,
  GoogleDriveOAuthController,
} from "./google-drive-oauth.controller.js";
import { GoogleDriveOAuthService } from "./google-drive-oauth.service.js";
import { GoogleDriveReferenceService } from "./google-drive-reference.service.js";
import { GoogleDriveRootService } from "./google-drive-root.service.js";
import { GoogleDriveTaskFolderService } from "./google-drive-task-folder.service.js";
import { IntegrationEventDispatcher } from "./integration-event-dispatcher.js";
import { IntegrationOutboxPublisher } from "./integration-outbox.publisher.js";
import { IntegrationOutboxWorker } from "./integration-outbox.worker.js";
import { IntegrationPluginRegistry } from "./integration-plugin.registry.js";
import { IntegrationsConfigProvider } from "./integrations.config.js";
import { IntegrationsController } from "./integrations.controller.js";
import { IntegrationsService } from "./integrations.service.js";
import type { WorkspaceIntegrationsStore } from "./integrations.store.js";
import { createGoogleDriveIntegrationPlugin } from "./plugins/google-drive.integration-plugin.js";
import { telegramIntegrationPlugin } from "./plugins/telegram.integration-plugin.js";
import {
  TelegramConnectController,
  TelegramInternalConnectController,
} from "./telegram-connect.controller.js";
import { TelegramConnectService } from "./telegram-connect.service.js";
import { TypeOrmIntegrationOutboxStore } from "./typeorm-integration-outbox.store.js";
import { TypeOrmWorkspaceIntegrationsStore } from "./typeorm-workspace-integrations.store.js";

const integrationPluginRegistryProvider: Provider<IntegrationPluginRegistry> = {
  provide: IntegrationPluginRegistry,
  useFactory: (
    googleDriveTaskFolders: GoogleDriveTaskFolderService,
    googleDriveReferences: GoogleDriveReferenceService,
  ): IntegrationPluginRegistry => {
    const plugins: readonly IntegrationPlugin[] = [
      createGoogleDriveIntegrationPlugin(async (event, context) => {
        await googleDriveTaskFolders.handleDomainEvent(event, context);
        await googleDriveReferences.handleDomainEvent(event, context);
      }),
      telegramIntegrationPlugin,
    ];
    return new IntegrationPluginRegistry(plugins);
  },
  inject: [GoogleDriveTaskFolderService, GoogleDriveReferenceService],
};

const integrationsServiceProvider: Provider<IntegrationsService> = {
  provide: IntegrationsService,
  useFactory: (
    store: WorkspaceIntegrationsStore,
    registry: IntegrationPluginRegistry,
  ): IntegrationsService => new IntegrationsService(store, registry),
  inject: [TypeOrmWorkspaceIntegrationsStore, IntegrationPluginRegistry],
};

@Module({
  imports: [DatabaseModule],
  controllers: [
    GoogleDriveOAuthCallbackController,
    GoogleDriveOAuthController,
    IntegrationsController,
    TelegramConnectController,
    TelegramInternalConnectController,
  ],
  providers: [
    BotSharedSecretGuard,
    TypeOrmWorkspaceIntegrationsStore,
    integrationPluginRegistryProvider,
    integrationsServiceProvider,
    TypeOrmIntegrationOutboxStore,
    IntegrationsConfigProvider,
    DatabaseIntegrationSecretProvider,
    GoogleDriveAccessService,
    GoogleDriveOAuthClient,
    GoogleDriveOAuthService,
    GoogleDriveReferenceService,
    GoogleDriveClient,
    GoogleDriveRootService,
    GoogleDriveTaskFolderService,
    IntegrationEventDispatcher,
    IntegrationOutboxPublisher,
    IntegrationOutboxWorker,
    TelegramConnectService,
  ],
  exports: [
    DatabaseIntegrationSecretProvider,
    IntegrationEventDispatcher,
    IntegrationOutboxPublisher,
    IntegrationPluginRegistry,
  ],
})
export class IntegrationsModule {}
