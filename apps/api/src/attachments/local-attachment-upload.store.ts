import { randomUUID } from "node:crypto";
import { mkdir, open, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { PayloadTooLargeException, ServiceUnavailableException } from "@nestjs/common";
import type { AttachmentContentConfig } from "../integrations/integrations.config.js";
import type {
  AttachmentUploadStore,
  StoredTaskFileUpload,
  StoreTaskFileUploadInput,
} from "./attachment-upload.store.js";

export class LocalAttachmentUploadStore implements AttachmentUploadStore {
  constructor(private readonly config: AttachmentContentConfig) {}

  async store(input: StoreTaskFileUploadInput): Promise<StoredTaskFileUpload> {
    const storageRoot = this.requireStorageRoot();
    if (input.bytes.byteLength > this.config.maxBytes) {
      throw new PayloadTooLargeException(
        `Task files must not exceed ${this.config.maxBytes} bytes.`,
      );
    }
    const directoryKey = `workspaces/${input.workspaceId}/tasks/${input.taskId}`;
    const storageKey = `${directoryKey}/${randomUUID()}`;
    const directoryPath = resolve(storageRoot, directoryKey);
    const filePath = resolve(storageRoot, storageKey);
    await mkdir(directoryPath, { mode: 0o700, recursive: true });
    const handle = await open(filePath, "wx", 0o600);
    try {
      await handle.writeFile(input.bytes);
    } catch (error) {
      await rm(filePath, { force: true });
      throw error;
    } finally {
      await handle.close();
    }
    return { sizeBytes: String(input.bytes.byteLength), storageKey };
  }

  async remove(storageKey: string): Promise<void> {
    const storageRoot = this.requireStorageRoot();
    await rm(resolve(storageRoot, storageKey), { force: true });
  }

  private requireStorageRoot(): string {
    if (this.config.storageRoot === null) {
      throw new ServiceUnavailableException(
        "ATTACHMENT_STORAGE_ROOT is required for task file uploads.",
      );
    }
    return this.config.storageRoot;
  }
}
