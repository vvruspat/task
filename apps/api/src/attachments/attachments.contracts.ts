import type {
  AttachmentKind,
  AttachmentTargetType,
} from "../persistence/types/core-persistence.types.js";

export type TaskAttachment = {
  id: string;
  workspaceId: string;
  targetType: AttachmentTargetType;
  targetId: string;
  kind: AttachmentKind;
  title: string | null;
  url: string | null;
  storageKey: string | null;
  telegramFileId: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  externalResourceId: string | null;
  modifiedAt: Date | null;
  providerResourceId: string | null;
  source: "google_drive" | "native";
};

export type CreateTaskLinkAttachmentInput = {
  url: string;
  title?: string | null;
};

export type CreateTaskFileAttachmentInput = {
  storageKey: string;
  title?: string | null;
  mimeType?: string | null;
  sizeBytes?: string | null;
};

export type CreateTaskTelegramFileAttachmentInput = {
  telegramFileId: string;
  title?: string | null;
  mimeType?: string | null;
  sizeBytes?: string | null;
};
