import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the dispatcher value at runtime.
import { IntegrationEventDispatcher } from "./integration-event-dispatcher.js";
import type { IntegrationOutboxStore } from "./integration-outbox.store.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the store value at runtime.
import { TypeOrmIntegrationOutboxStore } from "./typeorm-integration-outbox.store.js";

const pollIntervalMs = 1_000;
const batchSize = 25;
const leaseDurationMs = 5 * 60_000;
const maxAttempts = 8;
const maxRetryDelayMs = 15 * 60_000;

export type IntegrationOutboxRunResult = {
  deliveriesCreated: number;
  deliveriesFailed: number;
  deliveriesSucceeded: number;
};

@Injectable()
export class IntegrationOutboxWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(IntegrationOutboxWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly store: TypeOrmIntegrationOutboxStore,
    private readonly dispatcher: IntegrationEventDispatcher,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.store.isConfigured()) return;
    this.timer = setInterval(() => void this.runSafely(), pollIntervalMs);
    this.timer.unref();
    void this.runSafely();
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(now = new Date()): Promise<IntegrationOutboxRunResult> {
    const deliveriesCreated = await this.store.fanOutPending(batchSize, now);
    const claimed = await this.store.claimPending({
      batchSize,
      claimedAt: now,
      leaseDurationMs,
    });
    let deliveriesFailed = 0;
    let deliveriesSucceeded = 0;
    for (const delivery of claimed) {
      try {
        await this.dispatcher.dispatch(delivery);
        await this.store.complete({
          deliveryId: delivery.delivery.id,
          lockToken: delivery.delivery.lockToken,
          processedAt: new Date(),
        });
        deliveriesSucceeded += 1;
      } catch (error: unknown) {
        const retryAt = retryAtForAttempt(delivery.delivery.attemptCount, new Date());
        await this.store.fail({
          deliveryId: delivery.delivery.id,
          error: formatDeliveryError(error),
          lockToken: delivery.delivery.lockToken,
          retryAt,
        });
        deliveriesFailed += 1;
      }
    }
    return { deliveriesCreated, deliveriesFailed, deliveriesSucceeded };
  }

  private async runSafely(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.runOnce();
      if (
        result.deliveriesCreated > 0 ||
        result.deliveriesFailed > 0 ||
        result.deliveriesSucceeded > 0
      ) {
        this.logger.log(
          `Integration outbox: ${result.deliveriesCreated} created, ${result.deliveriesSucceeded} delivered, ${result.deliveriesFailed} failed.`,
        );
      }
    } catch (error: unknown) {
      this.logger.error("Integration outbox worker failed.", error);
    } finally {
      this.running = false;
    }
  }
}

export function retryAtForAttempt(attempt: number, now: Date): Date | null {
  if (attempt >= maxAttempts) return null;
  const delayMs = Math.min(2 ** Math.max(0, attempt - 1) * 2_000, maxRetryDelayMs);
  return new Date(now.getTime() + delayMs);
}

export function formatDeliveryError(error: unknown): string {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : "Unknown delivery error";
  return message.slice(0, 2_000);
}

export type { IntegrationOutboxStore };
