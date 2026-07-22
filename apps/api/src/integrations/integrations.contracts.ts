import type { IntegrationAuthKind, IntegrationCapabilityKind } from "@task/integration-sdk";

export type WorkspaceIntegrationStatus = "authorizing" | "connected" | "disconnected" | "error";

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
};
