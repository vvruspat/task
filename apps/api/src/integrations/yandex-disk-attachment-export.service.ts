import { Inject, Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import {
  type AttachmentContentProvider,
  attachmentContentProviderToken,
} from "./attachment-content.provider.js";
import { TypeOrmYandexDiskAttachmentExportStore } from "./typeorm-yandex-disk-attachment-export.store.js";
import { joinYandexDiskPath, YandexDiskClient } from "./yandex-disk.client.js";
import { YandexDiskAccessService } from "./yandex-disk-access.service.js";
import type { YandexDiskAttachmentExportStore } from "./yandex-disk-attachment-export.contracts.js";
import { YandexDiskTaskFolderService } from "./yandex-disk-task-folder.service.js";

const yandexDiskPluginKey = "yandex-disk";

@Injectable()
export class YandexDiskAttachmentExportService {
  constructor(
    @Inject(YandexDiskAccessService)
    private readonly accessService: YandexDiskAccessService,
    @Inject(YandexDiskTaskFolderService)
    private readonly taskFolderService: YandexDiskTaskFolderService,
    @Inject(YandexDiskClient)
    private readonly diskClient: YandexDiskClient,
    @Inject(TypeOrmYandexDiskAttachmentExportStore)
    private readonly store: YandexDiskAttachmentExportStore,
    @Inject(attachmentContentProviderToken)
    private readonly contentProvider: AttachmentContentProvider,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    context: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (context.pluginKey !== yandexDiskPluginKey) {
      throw new Error(`Unexpected integration plugin ${context.pluginKey}.`);
    }
    if (
      event.name === "integration.connected.v1" &&
      event.entity.type === "workspace_integration" &&
      event.entity.id === context.installationId &&
      event.payload["configuration"] === "rootFolder"
    ) {
      await this.backfill(event, context);
      return;
    }
    if (event.name !== "attachment.created.v1" || event.entity.type !== "attachment") return;
    await this.exportAttachment(event.entity.id, event, context);
  }

  private async backfill(
    event: IntegrationDomainEvent,
    context: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    for (const attachmentId of await this.store.listAttachmentIds(event.workspaceId)) {
      await this.exportAttachment(attachmentId, event, context);
    }
  }

  private async exportAttachment(
    attachmentId: string,
    event: IntegrationDomainEvent,
    context: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    const attachment = await this.store.findAttachment(event.workspaceId, attachmentId);
    if (attachment === null) return;
    const access = await this.accessService.getAccessGrant(
      event.workspaceId,
      context.installationId,
    );
    let reservation = await this.store.findReservation(access.connectionId, attachment.id);
    if (reservation?.status === "active") return;
    const content = await this.contentProvider.read(attachment);
    if (content === null) return;
    if (reservation === null) {
      const parentPath = await this.taskFolderService.ensureFolderForTask(attachment.targetId, {
        access,
        actorUserId: event.actorUserId,
        workspaceId: event.workspaceId,
      });
      if (parentPath === null) return;
      const name = buildYandexDiskAttachmentFileName(content.fileName, attachment.id);
      reservation = await this.store.reserve({
        actorUserId: event.actorUserId,
        attachmentId: attachment.id,
        connectionId: access.connectionId,
        filePath: joinYandexDiskPath(parentPath, name),
        mimeType: content.mimeType,
        name,
        parentPath,
        workspaceId: event.workspaceId,
      });
    }
    if (reservation.status === "active") return;
    const file = await this.diskClient.uploadFile(access.accessToken, {
      bytes: content.bytes,
      mimeType: reservation.mimeType,
      name: reservation.name,
      parentPath: reservation.parentPath,
    });
    if (file.path !== reservation.filePath)
      throw new Error("Yandex Disk returned an unexpected upload path.");
    await this.store.markActive(access.connectionId, reservation.resourceId, attachment.id, file);
  }
}

export function buildYandexDiskAttachmentFileName(fileName: string, attachmentId: string): string {
  const sanitizedName = sanitizeYandexDiskFileName(fileName);
  const dot = sanitizedName.lastIndexOf(".");
  const suffix = ` [tAsk-${attachmentId.slice(0, 8)}]`;
  const extensionCandidate = dot > 0 ? sanitizedName.slice(dot) : "";
  const extension = extensionCandidate.length <= 40 ? extensionCandidate : "";
  const base = (dot > 0 && extension.length > 0 ? sanitizedName.slice(0, dot) : sanitizedName)
    .trimEnd()
    .replace(/[. ]+$/gu, "");
  const maxBaseLength = Math.max(1, 240 - suffix.length - extension.length);
  return `${base.slice(0, maxBaseLength)}${suffix}${extension}`;
}

function sanitizeYandexDiskFileName(fileName: string): string {
  const sanitized = Array.from(fileName)
    .map((character) => {
      const codePoint = character.codePointAt(0);
      if (
        codePoint === undefined ||
        codePoint < 32 ||
        codePoint === 127 ||
        '/:*?"<>|\\'.includes(character)
      ) {
        return " ";
      }
      return character;
    })
    .join("")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[. ]+$/gu, "");
  return sanitized.length === 0 ? "File" : sanitized;
}
