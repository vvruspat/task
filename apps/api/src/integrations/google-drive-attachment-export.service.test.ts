import assert from "node:assert/strict";
import test from "node:test";
import type {
  IntegrationDomainEvent,
  IntegrationDomainEventHandlerContext,
} from "@task/integration-sdk";
import type {
  AttachmentContentProvider,
  AttachmentContentSource,
} from "./attachment-content.provider.js";
import type {
  GoogleDriveClient,
  GoogleDriveFile,
  UploadGoogleDriveFileInput,
} from "./google-drive.client.js";
import type { GoogleDriveAccessService } from "./google-drive-access.service.js";
import type {
  GoogleDriveAttachmentExportReservation,
  GoogleDriveAttachmentExportStore,
  GoogleDriveExportableAttachment,
  ReserveGoogleDriveAttachmentExportInput,
} from "./google-drive-attachment-export.contracts.js";
import { GoogleDriveAttachmentExportService } from "./google-drive-attachment-export.service.js";
import type { GoogleDriveTaskFolderService } from "./google-drive-task-folder.service.js";

const workspaceId = "aaaaaaaa-0000-4000-8000-000000000001";
const installationId = "aaaaaaaa-0000-4000-8000-000000000002";
const attachmentId = "aaaaaaaa-0000-4000-8000-000000000003";
const taskId = "aaaaaaaa-0000-4000-8000-000000000004";
const connectionId = "aaaaaaaa-0000-4000-8000-000000000005";
const actorUserId = "aaaaaaaa-0000-4000-8000-000000000006";

const event: IntegrationDomainEvent = {
  actorUserId,
  entity: { id: attachmentId, type: "attachment" },
  id: "event-id",
  name: "attachment.created.v1",
  occurredAt: "2026-07-22T12:00:00.000Z",
  payload: { kind: "file", taskId },
  workspaceId,
};

const handlerContext: IntegrationDomainEventHandlerContext = {
  attempt: 1,
  idempotencyKey: "event-id:installation-id",
  installationId,
  pluginKey: "google-drive",
  pluginVersion: "1.0.0",
};

const attachment: GoogleDriveExportableAttachment = {
  id: attachmentId,
  kind: "file",
  mimeType: "text/plain",
  sizeBytes: "5",
  storageKey: "tasks/note.txt",
  targetId: taskId,
  targetType: "task",
  telegramFileId: null,
  title: "note.txt",
  workspaceId,
};

test("Google Drive attachment export reserves an ID before upload and becomes idempotent", async () => {
  let reservation: GoogleDriveAttachmentExportReservation | null = null;
  const calls: string[] = [];
  const store: GoogleDriveAttachmentExportStore = {
    async findAttachment() {
      return attachment;
    },
    async findReservation() {
      return reservation;
    },
    async listAttachmentIds() {
      return [];
    },
    async markActive(_connectionId, resourceId, _attachmentId, file) {
      calls.push(`active:${resourceId}:${file.id}`);
      reservation = {
        fileId: file.id,
        mimeType: file.mimeType,
        name: file.name,
        parentId: file.parentId ?? "",
        resourceId,
        status: "active",
      };
    },
    async reserve(input: ReserveGoogleDriveAttachmentExportInput) {
      calls.push(`reserve:${input.fileId}`);
      reservation = {
        fileId: input.fileId,
        mimeType: input.mimeType,
        name: input.name,
        parentId: input.parentId,
        resourceId: "resource-id",
        status: "reserved",
      };
      return reservation;
    },
  };
  const contentProvider: AttachmentContentProvider = {
    async read(source: AttachmentContentSource) {
      calls.push(`read:${source.id}`);
      return {
        bytes: new TextEncoder().encode("hello"),
        fileName: "note.txt",
        mimeType: "text/plain",
        sizeBytes: 5,
      };
    },
  };
  const accessService: Pick<GoogleDriveAccessService, "getAccessGrant"> = {
    async getAccessGrant() {
      return { accessToken: "access-token", connectionId, expiresInSeconds: 3_600 };
    },
  };
  const taskFolderService: Pick<GoogleDriveTaskFolderService, "ensureFolderForTask"> = {
    async ensureFolderForTask() {
      calls.push("folder");
      return "task-folder-id";
    },
  };
  const driveClient: Pick<GoogleDriveClient, "generateFileId" | "uploadFile"> = {
    async generateFileId() {
      calls.push("generate");
      return "generated-file-id";
    },
    async uploadFile(_accessToken: string, input: UploadGoogleDriveFileInput) {
      calls.push(`upload:${input.fileId}`);
      return createDriveFile(input);
    },
  };
  const service = new GoogleDriveAttachmentExportService(
    accessService,
    taskFolderService,
    driveClient,
    store,
    contentProvider,
  );

  await service.handleDomainEvent(event, handlerContext);
  await service.handleDomainEvent(event, handlerContext);

  assert.deepEqual(calls, [
    `read:${attachmentId}`,
    "folder",
    "generate",
    "reserve:generated-file-id",
    "upload:generated-file-id",
    "active:resource-id:generated-file-id",
  ]);
});

test("Google Drive attachment export ignores content kinds without a provider", async () => {
  let generated = false;
  const service = new GoogleDriveAttachmentExportService(
    {
      async getAccessGrant() {
        return { accessToken: "access-token", connectionId, expiresInSeconds: 3_600 };
      },
    },
    {
      async ensureFolderForTask() {
        throw new Error("Folder provisioning should not run.");
      },
    },
    {
      async generateFileId() {
        generated = true;
        return "generated-file-id";
      },
      async uploadFile() {
        throw new Error("Upload should not run.");
      },
    },
    createReadOnlyStore({ ...attachment, kind: "link", storageKey: null }),
    {
      async read() {
        return null;
      },
    },
  );

  await service.handleDomainEvent(event, handlerContext);
  assert.equal(generated, false);
});

function createReadOnlyStore(
  storedAttachment: GoogleDriveExportableAttachment,
): GoogleDriveAttachmentExportStore {
  return {
    async findAttachment() {
      return storedAttachment;
    },
    async findReservation() {
      return null;
    },
    async listAttachmentIds() {
      return [];
    },
    async markActive() {
      throw new Error("Export should not become active.");
    },
    async reserve() {
      throw new Error("Export should not be reserved.");
    },
  };
}

function createDriveFile(input: UploadGoogleDriveFileInput): GoogleDriveFile {
  return {
    appProperties: input.appProperties,
    id: input.fileId,
    mimeType: input.mimeType,
    modifiedAt: "2026-07-22T12:00:00.000Z",
    name: input.name,
    parentId: input.parentId,
    version: "1",
    webViewLink: `https://drive.google.com/file/d/${input.fileId}/view`,
  };
}
