export type StoreTaskFileUploadInput = {
  bytes: Uint8Array;
  taskId: string;
  workspaceId: string;
};

export type StoredTaskFileUpload = {
  sizeBytes: string;
  storageKey: string;
};

export interface AttachmentUploadStore {
  remove(storageKey: string): Promise<void>;
  store(input: StoreTaskFileUploadInput): Promise<StoredTaskFileUpload>;
}

export const attachmentUploadStoreToken = Symbol("AttachmentUploadStore");
