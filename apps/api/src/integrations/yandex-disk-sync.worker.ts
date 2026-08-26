import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { YandexDiskSyncService } from "./yandex-disk-sync.service.js";

const pollIntervalMs = 60_000;

@Injectable()
export class YandexDiskSyncWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(YandexDiskSyncWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private readonly service: YandexDiskSyncService) {}

  onApplicationBootstrap(): void {
    if (!this.service.isConfigured()) return;
    this.timer = setInterval(() => void this.runSafely(), pollIntervalMs);
    this.timer.unref();
    void this.runSafely();
  }

  onApplicationShutdown(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce(): ReturnType<YandexDiskSyncService["syncAll"]> {
    return await this.service.syncAll();
  }

  private async runSafely(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.runOnce();
      if (result.failed > 0 || result.eventsRecorded > 0) {
        this.logger.log(
          `Yandex Disk sync: ${result.foldersScanned} folders, ${result.eventsRecorded} events, ${result.failed} failed.`,
        );
      }
    } catch (error: unknown) {
      this.logger.error("Yandex Disk sync worker failed.", error);
    } finally {
      this.running = false;
    }
  }
}
