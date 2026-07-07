import type { TaskBackendClient, WorkspaceStatusResponse } from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StatusListToolInput = {
  workspaceId: string;
  userId: string;
};

export type StatusToolHandlers = {
  list(input: unknown): Promise<WorkspaceStatusResponse[]>;
};

export class StatusToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusToolInputError";
  }
}

export function createStatusToolHandlers(client: TaskBackendClient): StatusToolHandlers {
  return {
    list: (input) => {
      const parsedInput = parseStatusListToolInput(input);

      return client.listWorkspaceStatuses({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });
    },
  };
}

export function parseStatusListToolInput(input: unknown): StatusListToolInput {
  const record = readRecord(input, "status list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new StatusToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new StatusToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new StatusToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}
