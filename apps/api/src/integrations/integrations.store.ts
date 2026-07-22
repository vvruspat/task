import type {
  WorkspaceIntegration,
  WorkspaceIntegrationDeliveryHealth,
  WorkspaceIntegrationSubscriptionHealth,
  WorkspaceIntegrationWebhookHealth,
} from "./integrations.contracts.js";

export type WorkspaceIntegrationOperationalSnapshot = {
  integration: WorkspaceIntegration;
  connection: {
    status: "connected" | "disconnected" | "error";
    lastError: string | null;
  } | null;
  subscriptions: WorkspaceIntegrationSubscriptionHealth;
  deliveries: WorkspaceIntegrationDeliveryHealth;
  webhooks: WorkspaceIntegrationWebhookHealth;
};

export type InstallWorkspaceIntegrationResult =
  | { status: "installed" | "already_installed"; integration: WorkspaceIntegration }
  | { status: "forbidden" };

export type UninstallWorkspaceIntegrationResult =
  | { status: "uninstalled"; integration: WorkspaceIntegration }
  | { status: "forbidden" }
  | { status: "integration_connected" }
  | { status: "integration_not_found" };

export type WorkspaceIntegrationsStore = {
  listForManager(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceIntegrationOperationalSnapshot[] | null>;
  install(
    workspaceId: string,
    userId: string,
    pluginKey: string,
    pluginVersion: string,
  ): Promise<InstallWorkspaceIntegrationResult>;
  uninstall(
    workspaceId: string,
    integrationId: string,
    userId: string,
  ): Promise<UninstallWorkspaceIntegrationResult>;
};
