import type { AttachmentKind } from "../persistence/types/core-persistence.types.js";
import type { YandexDiskResource } from "./yandex-disk.client.js";

export type YandexDiskExportableAttachment = {
  id: string;
  kind: AttachmentKind;
  mimeType: string | null;
  sizeBytes: string | null;
  storageKey: string | null;
  targetId: string;
  targetType: "task";
  telegramFileId: string | null;
  title: string | null;
  workspaceId: string;
};

export type YandexDiskAttachmentExportReservation = {
  filePath: string;
  mimeType: string;
  name: string;
  parentPath: string;
  resourceId: string;
  status: "active" | "reserved";
};

export type ReserveYandexDiskAttachmentExportInput = {
  actorUserId: string | null;
  attachmentId: string;
  connectionId: string;
  filePath: string;
  mimeType: string;
  name: string;
  parentPath: string;
  workspaceId: string;
};

export interface YandexDiskAttachmentExportStore {
  findAttachment(
    workspaceId: string,
    attachmentId: string,
  ): Promise<YandexDiskExportableAttachment | null>;
  findReservation(
    connectionId: string,
    attachmentId: string,
  ): Promise<YandexDiskAttachmentExportReservation | null>;
  listAttachmentIds(workspaceId: string): Promise<readonly string[]>;
  markActive(
    connectionId: string,
    resourceId: string,
    attachmentId: string,
    file: YandexDiskResource,
  ): Promise<void>;
  reserve(
    input: ReserveYandexDiskAttachmentExportInput,
  ): Promise<YandexDiskAttachmentExportReservation>;
}
