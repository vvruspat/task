import type { IntegrationDomainEvent, IntegrationDomainEventName } from "@task/integration-sdk";

export const integrationDeliveryStatuses = ["pending", "processing", "succeeded", "dead"] as const;

export type IntegrationDeliveryStatus = (typeof integrationDeliveryStatuses)[number];

export type IntegrationOutboxEvent = {
  id: string;
  workspaceId: string;
  activityEventId: string | null;
  eventName: IntegrationDomainEventName;
  actorUserId: string | null;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  createdAt: Date;
};

export type IntegrationEventDelivery = {
  id: string;
  outboxEventId: string;
  workspaceIntegrationId: string;
  pluginKey: string;
  pluginVersion: string;
  status: IntegrationDeliveryStatus;
  attemptCount: number;
  availableAt: Date;
  lockedAt: Date | null;
  lockToken: string | null;
  processedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClaimedIntegrationDelivery = {
  delivery: IntegrationEventDelivery & { lockToken: string };
  event: IntegrationDomainEvent;
};
