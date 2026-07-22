import type { AttachmentKind } from "../persistence/types/core-persistence.types.js";
import type { GoogleDriveFile } from "./google-drive.client.js";

export type GoogleDriveExportableAttachment = {
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

export type GoogleDriveAttachmentExportReservation = {
  fileId: string;
  mimeType: string;
  name: string;
  parentId: string;
  resourceId: string;
  status: "active" | "reserved";
};

export type ReserveGoogleDriveAttachmentExportInput = {
  actorUserId: string | null;
  attachmentId: string;
  connectionId: string;
  fileId: string;
  mimeType: string;
  name: string;
  parentId: string;
  workspaceId: string;
};

export interface GoogleDriveAttachmentExportStore {
  findAttachment(
    workspaceId: string,
    attachmentId: string,
  ): Promise<GoogleDriveExportableAttachment | null>;
  findReservation(
    connectionId: string,
    attachmentId: string,
  ): Promise<GoogleDriveAttachmentExportReservation | null>;
  listAttachmentIds(workspaceId: string): Promise<readonly string[]>;
  markActive(
    connectionId: string,
    resourceId: string,
    attachmentId: string,
    file: GoogleDriveFile,
  ): Promise<void>;
  reserve(
    input: ReserveGoogleDriveAttachmentExportInput,
  ): Promise<GoogleDriveAttachmentExportReservation>;
}
