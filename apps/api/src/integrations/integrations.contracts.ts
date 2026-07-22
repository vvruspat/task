import type { IntegrationAuthKind, IntegrationCapabilityKind } from "@task/integration-sdk";

export type WorkspaceIntegrationStatus = "authorizing" | "connected" | "disconnected" | "error";

export const workspaceIntegrationHealthStatuses = [
  "healthy",
  "degraded",
  "error",
  "inactive",
] as const;

export type WorkspaceIntegrationHealthStatus = (typeof workspaceIntegrationHealthStatuses)[number];

export type WorkspaceIntegrationConnectionHealth = {
  status: "connected" | "disconnected" | "error" | "missing";
  lastError: string | null;
};

export type WorkspaceIntegrationSubscriptionHealth = {
  activeCount: number;
  renewingCount: number;
  expiredCount: number;
  errorCount: number;
  stoppedCount: number;
};

export type WorkspaceIntegrationDeliveryHealth = {
  pendingCount: number;
  processingCount: number;
  succeededCount: number;
  deadCount: number;
};

export type WorkspaceIntegrationWebhookHealth = {
  receivedCount: number;
  processingCount: number;
  processedCount: number;
  ignoredCount: number;
  failedCount: number;
};

export type WorkspaceIntegrationHealth = {
  status: WorkspaceIntegrationHealthStatus;
  checkedAt: Date;
  connection: WorkspaceIntegrationConnectionHealth;
  subscriptions: WorkspaceIntegrationSubscriptionHealth;
  deliveries: WorkspaceIntegrationDeliveryHealth;
  webhooks: WorkspaceIntegrationWebhookHealth;
};

export type WorkspaceIntegration = {
  id: string;
  workspaceId: string;
  pluginKey: string;
  pluginVersion: string;
  status: WorkspaceIntegrationStatus;
  config: Record<string, unknown>;
  installedByUserId: string;
  connectedByUserId: string | null;
  connectedAt: Date | null;
  disconnectedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationCatalogItem = {
  pluginKey: string;
  pluginVersion: string;
  name: string;
  description: string;
  iconKey: string;
  authKind: IntegrationAuthKind;
  requiredScopes: string[];
  capabilityKinds: IntegrationCapabilityKind[];
  installation: WorkspaceIntegration | null;
  health: WorkspaceIntegrationHealth | null;
};
