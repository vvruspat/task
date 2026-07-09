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
  createdByUserId: string;
  createdAt: Date;
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
