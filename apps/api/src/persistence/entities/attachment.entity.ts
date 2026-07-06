import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import type {
  AttachmentKind,
  AttachmentRecord,
  AttachmentTargetType,
} from "../types/core-persistence.types.js";

@Entity({ name: "attachments" })
@Check("chk_attachments_target_type", `"target_type" IN ('task', 'project', 'comment')`)
@Check("chk_attachments_kind", `"kind" IN ('file', 'link', 'telegram_file')`)
@Index("idx_attachments_workspace_id_target", ["workspaceId", "targetType", "targetId"])
@Index("idx_attachments_workspace_id_created_by_user_id", ["workspaceId", "createdByUserId"])
export class AttachmentEntity implements AttachmentRecord {
  @PrimaryGeneratedColumn("uuid")
  id = "";

  @Column({ name: "workspace_id", type: "uuid" })
  workspaceId = "";

  @Column({ name: "target_type", type: "text" })
  targetType: AttachmentTargetType = "task";

  @Column({ name: "target_id", type: "uuid" })
  targetId = "";

  @Column({ type: "text" })
  kind: AttachmentKind = "file";

  @Column({ nullable: true, type: "text" })
  title: string | null = null;

  @Column({ nullable: true, type: "text" })
  url: string | null = null;

  @Column({ name: "storage_key", nullable: true, type: "text" })
  storageKey: string | null = null;

  @Column({ name: "telegram_file_id", nullable: true, type: "text" })
  telegramFileId: string | null = null;

  @Column({ name: "mime_type", nullable: true, type: "text" })
  mimeType: string | null = null;

  @Column({ name: "size_bytes", nullable: true, type: "bigint" })
  sizeBytes: string | null = null;

  @Column({ name: "created_by_user_id", type: "uuid" })
  createdByUserId = "";

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt = new Date(0);
}
