import { Inject, Injectable } from "@nestjs/common";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import {
  type AttachmentContentProvider,
  attachmentContentProviderToken,
} from "./attachment-content.provider.js";
import { GoogleDriveClient } from "./google-drive.client.js";
import {
  type GoogleDriveAccessGrant,
  GoogleDriveAccessService,
} from "./google-drive-access.service.js";
import type { GoogleDriveAttachmentExportStore } from "./google-drive-attachment-export.contracts.js";
import { GoogleDriveTaskFolderService } from "./google-drive-task-folder.service.js";
import { TypeOrmGoogleDriveAttachmentExportStore } from "./typeorm-google-drive-attachment-export.store.js";

const googleDrivePluginKey = "google-drive";

type GoogleDriveAccessGrantProvider = Pick<GoogleDriveAccessService, "getAccessGrant">;
type GoogleDriveAttachmentClient = Pick<GoogleDriveClient, "generateFileId" | "uploadFile">;
type GoogleDriveTaskFolderProvider = Pick<GoogleDriveTaskFolderService, "ensureFolderForTask">;

type AttachmentExportContext = {
  access: GoogleDriveAccessGrant;
  actorUserId: string | null;
  installationId: string;
  workspaceId: string;
};

@Injectable()
export class GoogleDriveAttachmentExportService {
  constructor(
    @Inject(GoogleDriveAccessService)
    private readonly accessService: GoogleDriveAccessGrantProvider,
    @Inject(GoogleDriveTaskFolderService)
    private readonly taskFolderService: GoogleDriveTaskFolderProvider,
    @Inject(GoogleDriveClient)
    private readonly driveClient: GoogleDriveAttachmentClient,
    @Inject(TypeOrmGoogleDriveAttachmentExportStore)
    private readonly store: GoogleDriveAttachmentExportStore,
    @Inject(attachmentContentProviderToken)
    private readonly contentProvider: AttachmentContentProvider,
  ) {}

  async handleDomainEvent(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    if (handlerContext.pluginKey !== googleDrivePluginKey) {
      throw new Error(`Unexpected integration plugin ${handlerContext.pluginKey}.`);
    }
    if (
      event.name === "integration.connected.v1" &&
      event.entity.type === "workspace_integration" &&
      event.entity.id === handlerContext.installationId &&
      event.payload["configuration"] === "rootFolder"
    ) {
      await this.backfillAttachments(event, handlerContext);
      return;
    }
    if (event.name !== "attachment.created.v1" || event.entity.type !== "attachment") return;
    const context = await this.createContext(event, handlerContext);
    await this.exportAttachment(event.entity.id, context);
  }

  private async backfillAttachments(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<void> {
    const attachmentIds = await this.store.listAttachmentIds(event.workspaceId);
    if (attachmentIds.length === 0) return;
    const context = await this.createContext(event, handlerContext);
    for (const attachmentId of attachmentIds) {
      await this.exportAttachment(attachmentId, context);
    }
  }

  private async createContext(
    event: IntegrationDomainEvent,
    handlerContext: IntegrationDomainEventHandlerContext,
  ): Promise<AttachmentExportContext> {
    return {
      access: await this.accessService.getAccessGrant(
        event.workspaceId,
        handlerContext.installationId,
      ),
      actorUserId: event.actorUserId,
      installationId: handlerContext.installationId,
      workspaceId: event.workspaceId,
    };
  }

  private async exportAttachment(
    attachmentId: string,
    context: AttachmentExportContext,
  ): Promise<void> {
    const attachment = await this.store.findAttachment(context.workspaceId, attachmentId);
    if (attachment === null) return;
    let reservation = await this.store.findReservation(context.access.connectionId, attachment.id);
    if (reservation?.status === "active") return;

    const content = await this.contentProvider.read(attachment);
    if (content === null) return;
    if (reservation === null) {
      const parentId = await this.taskFolderService.ensureFolderForTask(attachment.targetId, {
        access: context.access,
        actorUserId: context.actorUserId,
        installationId: context.installationId,
        workspaceId: context.workspaceId,
      });
      if (parentId === null) return;
      const fileId = await this.driveClient.generateFileId(context.access.accessToken);
      reservation = await this.store.reserve({
        actorUserId: context.actorUserId,
        attachmentId: attachment.id,
        connectionId: context.access.connectionId,
        fileId,
        mimeType: content.mimeType,
        name: content.fileName,
        parentId,
        workspaceId: context.workspaceId,
      });
    }
    if (reservation.status === "active") return;

    const file = await this.driveClient.uploadFile(context.access.accessToken, {
      appProperties: {
        tAskAttachmentId: attachment.id,
        tAskIntegrationId: context.installationId,
        tAskTaskId: attachment.targetId,
        tAskWorkspaceId: context.workspaceId,
      },
      bytes: content.bytes,
      fileId: reservation.fileId,
      mimeType: reservation.mimeType,
      name: reservation.name,
      parentId: reservation.parentId,
    });
    await this.store.markActive(
      context.access.connectionId,
      reservation.resourceId,
      attachment.id,
      file,
    );
  }
}
