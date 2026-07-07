import type { TaskAttachmentResponse, TaskBackendClient } from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AttachmentListToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type AttachmentToolHandlers = {
  list(input: unknown): Promise<TaskAttachmentResponse[]>;
};

export class AttachmentToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentToolInputError";
  }
}

export function createAttachmentToolHandlers(client: TaskBackendClient): AttachmentToolHandlers {
  return {
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

export function parseAttachmentListToolInput(input: unknown): AttachmentListToolInput {
  const record = readRecord(input, "attachment list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
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
