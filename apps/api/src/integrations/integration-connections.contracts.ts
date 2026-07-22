import type { IntegrationSecretReference } from "@task/integration-sdk";

export const integrationConnectionStatuses = ["connected", "disconnected", "error"] as const;

export type IntegrationConnectionStatus = (typeof integrationConnectionStatuses)[number];

export type IntegrationConnection = {
  id: string;
  workspaceIntegrationId: string;
  providerAccountId: string;
  displayName: string | null;
  secretReference: IntegrationSecretReference;
  scopes: string[];
  metadata: Record<string, unknown>;
  status: IntegrationConnectionStatus;
  connectedByUserId: string;
  connectedAt: Date;
  disconnectedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationOAuthState = {
  id: string;
  stateHash: string;
  workspaceIntegrationId: string;
  pluginKey: string;
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};
