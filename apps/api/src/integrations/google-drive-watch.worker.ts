import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { GoogleDriveWatchService } from "./google-drive-watch.service.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the store value at runtime.
import { TypeOrmGoogleDriveWatchStore } from "./typeorm-google-drive-watch.store.js";

const pollIntervalMs = 60_000;
const batchSize = 20;

@Injectable()
export class GoogleDriveWatchWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(GoogleDriveWatchWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly store: TypeOrmGoogleDriveWatchStore,
    private readonly service: GoogleDriveWatchService,
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

  async runOnce(now = new Date()): Promise<{ failed: number; renewed: number }> {
    const due = await this.store.listDue(now, batchSize);
    let failed = 0;
    let renewed = 0;
    for (const subscription of due) {
      try {
        await this.service.renew(subscription, now);
        renewed += 1;
      } catch {
        failed += 1;
      }
    }
    return { failed, renewed };
  }

  private async runSafely(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.runOnce();
      if (result.failed > 0 || result.renewed > 0) {
        this.logger.log(
          `Google Drive watches: ${result.renewed} renewed, ${result.failed} failed.`,
        );
      }
    } catch (error: unknown) {
      this.logger.error("Google Drive watch worker failed.", error);
    } finally {
      this.running = false;
    }
  }
}
