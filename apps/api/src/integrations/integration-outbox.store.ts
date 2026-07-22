import type { ClaimedIntegrationDelivery } from "./integration-outbox.contracts.js";

export type ClaimIntegrationDeliveriesInput = {
  batchSize: number;
  claimedAt: Date;
  leaseDurationMs: number;
};

export type CompleteIntegrationDeliveryInput = {
  deliveryId: string;
  lockToken: string;
  processedAt: Date;
};

export type FailIntegrationDeliveryInput = {
  deliveryId: string;
  error: string;
  lockToken: string;
  retryAt: Date | null;
};

export interface IntegrationOutboxStore {
  isConfigured(): boolean;
  fanOutPending(batchSize: number, publishedAt: Date): Promise<number>;
  claimPending(input: ClaimIntegrationDeliveriesInput): Promise<ClaimedIntegrationDelivery[]>;
  complete(input: CompleteIntegrationDeliveryInput): Promise<void>;
  fail(input: FailIntegrationDeliveryInput): Promise<void>;
}
