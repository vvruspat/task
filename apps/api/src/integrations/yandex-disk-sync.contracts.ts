import type { YandexDiskResource } from "./yandex-disk.client.js";

export type SynchronizeYandexDiskFolderInput = {
  connectionId: string;
  files: readonly YandexDiskResource[];
  folderPath: string;
  syncedAt: Date;
  taskId: string;
  workspaceId: string;
};

export interface YandexDiskSyncStore {
  synchronizeFolder(input: SynchronizeYandexDiskFolderInput): Promise<number>;
}
