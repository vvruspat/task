import type {
  CreateTaskLinkAttachmentInput,
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

export type AttachmentToolHandlers = {
  list(input: unknown): Promise<TaskAttachmentResponse[]>;
  createLink(input: unknown): Promise<TaskAttachmentResponse>;
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

export function parseAttachmentListToolInput(input: unknown): AttachmentListToolInput {
  const record = readRecord(input, "attachment list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
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
