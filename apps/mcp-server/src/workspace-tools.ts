import type {
  TaskBackendClient,
  WorkspaceDetailResponse,
  WorkspaceMemberResponse,
  WorkspaceSummaryResponse,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WorkspaceGetCurrentToolInput = {
  userId: string;
  workspaceId?: string;
};

export type WorkspaceMemberListToolInput = {
  workspaceId: string;
  userId: string;
};

export type WorkspaceToolHandlers = {
  getCurrent(input: unknown): Promise<WorkspaceDetailResponse | WorkspaceSummaryResponse | null>;
  listMembers(input: unknown): Promise<WorkspaceMemberResponse[]>;
};

export class WorkspaceToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceToolInputError";
  }
}

export function createWorkspaceToolHandlers(client: TaskBackendClient): WorkspaceToolHandlers {
  return {
    getCurrent: async (input) => {
      const parsedInput = parseWorkspaceGetCurrentToolInput(input);

      if (parsedInput.workspaceId !== undefined) {
        return client.getWorkspace({
          workspaceId: parsedInput.workspaceId,
          userId: parsedInput.userId,
        });
      }

      const workspaces = await client.listWorkspaces({ userId: parsedInput.userId });

      return workspaces[0] ?? null;
    },
    listMembers: (input) => {
      const parsedInput = parseWorkspaceMemberListToolInput(input);

      return client.listWorkspaceMembers({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });
    },
  };
}

export function parseWorkspaceGetCurrentToolInput(input: unknown): WorkspaceGetCurrentToolInput {
  const record = readRecord(input, "workspace get current tool input");
  const parsedInput: WorkspaceGetCurrentToolInput = {
    userId: readRequiredUuid(record, "userId"),
  };
  const workspaceId = readOptionalUuid(record, "workspaceId");

  if (workspaceId !== undefined) {
    parsedInput.workspaceId = workspaceId;
  }

  return parsedInput;
}

export function parseWorkspaceMemberListToolInput(input: unknown): WorkspaceMemberListToolInput {
  const record = readRecord(input, "workspace member list tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new WorkspaceToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new WorkspaceToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new WorkspaceToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}

function readOptionalUuid(
  record: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  return readRequiredUuid(record, propertyName);
}
