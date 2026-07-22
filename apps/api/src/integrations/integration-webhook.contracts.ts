export const integrationWebhookReceiptStatuses = [
  "received",
  "processing",
  "processed",
  "ignored",
  "failed",
] as const;

export type IntegrationWebhookReceiptStatus = (typeof integrationWebhookReceiptStatuses)[number];

export type IntegrationWebhookReceipt = {
  id: string;
  pluginKey: string;
  workspaceIntegrationId: string;
  connectionId: string;
  subscriptionId: string;
  providerEventId: string;
  eventType: string;
  status: IntegrationWebhookReceiptStatus;
  attemptCount: number;
  headers: Record<string, unknown>;
  payload: Record<string, unknown>;
  receivedAt: Date;
  processedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};
