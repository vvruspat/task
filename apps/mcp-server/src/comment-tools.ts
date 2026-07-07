import type { TaskBackendClient, TaskCommentResponse } from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommentListToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type CommentToolHandlers = {
  list(input: unknown): Promise<TaskCommentResponse[]>;
};

export class CommentToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentToolInputError";
  }
}

export function createCommentToolHandlers(client: TaskBackendClient): CommentToolHandlers {
  return {
    list: (input) => {
      const parsedInput = parseCommentListToolInput(input);

      return client.listTaskComments({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
      });
    },
  };
}

export function parseCommentListToolInput(input: unknown): CommentListToolInput {
  const record = readRecord(input, "comment list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new CommentToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new CommentToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new CommentToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}
