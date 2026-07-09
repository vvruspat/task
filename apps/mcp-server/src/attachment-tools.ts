import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
  TaskAttachmentResponse,
  TaskBackendClient,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttachmentListToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type AttachmentCreateLinkToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  url: string;
  title?: string | null;
};

export type AttachmentCreateFileToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  storageKey: string;
  title?: string | null;
  mimeType?: string | null;
  sizeBytes?: string | null;
};

export type AttachmentCreateTelegramFileToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  telegramFileId: string;
  title?: string | null;
  mimeType?: string | null;
  sizeBytes?: string | null;
};

export type AttachmentToolHandlers = {
  list(input: unknown): Promise<TaskAttachmentResponse[]>;
  createLink(input: unknown): Promise<TaskAttachmentResponse>;
  createFile(input: unknown): Promise<TaskAttachmentResponse>;
  createTelegramFile(input: unknown): Promise<TaskAttachmentResponse>;
};

export class AttachmentToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentToolInputError";
  }
}

export function createAttachmentToolHandlers(client: TaskBackendClient): AttachmentToolHandlers {
  return {
    createLink: (input) => {
      const parsedInput = parseAttachmentCreateLinkToolInput(input);

      return client.createTaskLinkAttachment({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toCreateTaskLinkAttachmentInput(parsedInput),
      });
    },
    createFile: (input) => {
      const parsedInput = parseAttachmentCreateFileToolInput(input);

      return client.createTaskFileAttachment({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toCreateTaskFileAttachmentInput(parsedInput),
      });
    },
    createTelegramFile: (input) => {
      const parsedInput = parseAttachmentCreateTelegramFileToolInput(input);

      return client.createTaskTelegramFileAttachment({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toCreateTaskTelegramFileAttachmentInput(parsedInput),
      });
    },
    list: (input) => {
      const parsedInput = parseAttachmentListToolInput(input);

      return client.listTaskAttachments({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
      });
    },
  };
}

export function parseAttachmentCreateLinkToolInput(input: unknown): AttachmentCreateLinkToolInput {
  const record = readRecord(input, "attachment create link tool input");
  const parsedInput: AttachmentCreateLinkToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    url: readRequiredUrl(record, "url"),
  };
  const title = readOptionalNullableString(record, "title");

  if (title !== undefined) {
    parsedInput.title = title;
  }

  return parsedInput;
}

export function parseAttachmentCreateFileToolInput(input: unknown): AttachmentCreateFileToolInput {
  const record = readRecord(input, "attachment create file tool input");
  const parsedInput: AttachmentCreateFileToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    storageKey: readRequiredString(record, "storageKey"),
  };
  const title = readOptionalNullableString(record, "title");
  const mimeType = readOptionalNullableString(record, "mimeType");
  const sizeBytes = readOptionalNullableSizeBytes(record, "sizeBytes");

  if (title !== undefined) {
    parsedInput.title = title;
  }

  if (mimeType !== undefined) {
    parsedInput.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    parsedInput.sizeBytes = sizeBytes;
  }

  return parsedInput;
}

export function parseAttachmentCreateTelegramFileToolInput(
  input: unknown,
): AttachmentCreateTelegramFileToolInput {
  const record = readRecord(input, "attachment create Telegram file tool input");
  const parsedInput: AttachmentCreateTelegramFileToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    telegramFileId: readRequiredString(record, "telegramFileId"),
  };
  const title = readOptionalNullableString(record, "title");
  const mimeType = readOptionalNullableString(record, "mimeType");
  const sizeBytes = readOptionalNullableSizeBytes(record, "sizeBytes");

  if (title !== undefined) {
    parsedInput.title = title;
  }

  if (mimeType !== undefined) {
    parsedInput.mimeType = mimeType;
  }

  if (sizeBytes !== undefined) {
    parsedInput.sizeBytes = sizeBytes;
  }

  return parsedInput;
}

export function parseAttachmentListToolInput(input: unknown): AttachmentListToolInput {
  const record = readRecord(input, "attachment list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function toCreateTaskFileAttachmentInput(
  input: AttachmentCreateFileToolInput,
): CreateTaskFileAttachmentInput {
  const body: CreateTaskFileAttachmentInput = {
    storageKey: input.storageKey,
  };

  if (input.title !== undefined) {
    body.title = input.title;
  }

  if (input.mimeType !== undefined) {
    body.mimeType = input.mimeType;
  }

  if (input.sizeBytes !== undefined) {
    body.sizeBytes = input.sizeBytes;
  }

  return body;
}

function toCreateTaskTelegramFileAttachmentInput(
  input: AttachmentCreateTelegramFileToolInput,
): CreateTaskTelegramFileAttachmentInput {
  const body: CreateTaskTelegramFileAttachmentInput = {
    telegramFileId: input.telegramFileId,
  };

  if (input.title !== undefined) {
    body.title = input.title;
  }

  if (input.mimeType !== undefined) {
    body.mimeType = input.mimeType;
  }

  if (input.sizeBytes !== undefined) {
    body.sizeBytes = input.sizeBytes;
  }

  return body;
}

function toCreateTaskLinkAttachmentInput(
  input: AttachmentCreateLinkToolInput,
): CreateTaskLinkAttachmentInput {
  const body: CreateTaskLinkAttachmentInput = {
    url: input.url,
  };

  if (input.title !== undefined) {
    body.title = input.title;
  }

  return body;
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new AttachmentToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new AttachmentToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new AttachmentToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}

function readRequiredString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new AttachmentToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new AttachmentToolInputError(`${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readRequiredUrl(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new AttachmentToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new AttachmentToolInputError(`${propertyName} must not be empty.`);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    throw new AttachmentToolInputError(`${propertyName} must be a valid URL.`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new AttachmentToolInputError(`${propertyName} must use http or https.`);
  }

  return parsedUrl.toString();
}

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new AttachmentToolInputError(`${propertyName} must be a string or null.`);
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function readOptionalNullableSizeBytes(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = readOptionalNullableString(record, propertyName);

  if (value === undefined || value === null) {
    return value;
  }

  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new AttachmentToolInputError(`${propertyName} must be a non-negative integer.`);
  }

  return value;
}
