export const integrationExternalResourceStatuses = ["active", "deleted", "unavailable"] as const;
export type IntegrationExternalResourceStatus =
  (typeof integrationExternalResourceStatuses)[number];

export type IntegrationExternalResource = {
  id: string;
  connectionId: string;
  providerResourceId: string;
  resourceKind: string;
  name: string;
  mimeType: string | null;
  webUrl: string | null;
  parentProviderResourceId: string | null;
  version: string | null;
  modifiedAt: Date | null;
  metadata: Record<string, unknown>;
  status: IntegrationExternalResourceStatus;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const integrationResourceLinkTargetTypes = [
  "workspace",
  "task",
  "comment",
  "attachment",
] as const;
export type IntegrationResourceLinkTargetType = (typeof integrationResourceLinkTargetTypes)[number];

export const integrationResourceLinkRelations = [
  "managed_root",
  "managed_container",
  "reference",
  "export",
] as const;
export type IntegrationResourceLinkRelation = (typeof integrationResourceLinkRelations)[number];

export type IntegrationResourceLink = {
  id: string;
  externalResourceId: string;
  targetType: IntegrationResourceLinkTargetType;
  targetId: string;
  relation: IntegrationResourceLinkRelation;
  createdByUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export const integrationResourceReferenceSourceTypes = ["task_description", "comment"] as const;
export type IntegrationResourceReferenceSourceType =
  (typeof integrationResourceReferenceSourceTypes)[number];

export const integrationResourceReferenceStatuses = ["active", "unresolved", "removed"] as const;
export type IntegrationResourceReferenceStatus =
  (typeof integrationResourceReferenceStatuses)[number];

export type IntegrationResourceReference = {
  id: string;
  connectionId: string;
  externalResourceId: string | null;
  sourceType: IntegrationResourceReferenceSourceType;
  sourceId: string;
  providerResourceId: string | null;
  url: string;
  urlHash: string;
  status: IntegrationResourceReferenceStatus;
  firstSeenAt: Date;
  lastSeenAt: Date;
  removedAt: Date | null;
  metadata: Record<string, unknown>;
};

export const integrationSubscriptionStatuses = [
  "active",
  "renewing",
  "expired",
  "error",
  "stopped",
] as const;
export type IntegrationSubscriptionStatus = (typeof integrationSubscriptionStatuses)[number];

export type IntegrationSubscription = {
  id: string;
  connectionId: string;
  externalResourceId: string | null;
  providerSubscriptionId: string;
  providerCursor: string | null;
  callbackSecretReference: string | null;
  status: IntegrationSubscriptionStatus;
  expiresAt: Date | null;
  renewAfter: Date | null;
  lastEventAt: Date | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
