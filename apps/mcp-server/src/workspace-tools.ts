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

export type WorkspaceUserResolveToolInput = {
  workspaceId: string;
  userId: string;
  query: string;
  limit?: number;
};

export type WorkspaceToolHandlers = {
  getCurrent(input: unknown): Promise<WorkspaceDetailResponse | WorkspaceSummaryResponse | null>;
  listMembers(input: unknown): Promise<WorkspaceMemberResponse[]>;
  resolveUser(input: unknown): Promise<WorkspaceMemberResponse[]>;
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
    resolveUser: async (input) => {
      const parsedInput = parseWorkspaceUserResolveToolInput(input);
      const members = await client.listWorkspaceMembers({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });

      return resolveWorkspaceMembers(members, parsedInput.query, parsedInput.limit ?? 10);
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

export function parseWorkspaceUserResolveToolInput(input: unknown): WorkspaceUserResolveToolInput {
  const record = readRecord(input, "workspace user resolve tool input");
  const parsedInput: WorkspaceUserResolveToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
    query: readRequiredNonEmptyString(record, "query"),
  };
  const limit = readOptionalBoundedInteger(record, "limit", 1, 20);

  if (limit !== undefined) {
    parsedInput.limit = limit;
  }

  return parsedInput;
}

function resolveWorkspaceMembers(
  members: WorkspaceMemberResponse[],
  query: string,
  limit: number,
): WorkspaceMemberResponse[] {
  const normalizedQuery = normalizeSearchValue(query);
  const matches = members
    .map((member, index) => ({
      index,
      member,
      rank: getWorkspaceMemberMatchRank(member, normalizedQuery),
    }))
    .filter((match): match is WorkspaceMemberMatch => match.rank !== null)
    .sort((left, right) => left.rank - right.rank || left.index - right.index);

  return matches.slice(0, limit).map((match) => match.member);
}

type WorkspaceMemberMatch = {
  index: number;
  member: WorkspaceMemberResponse;
  rank: number;
};

function getWorkspaceMemberMatchRank(
  member: WorkspaceMemberResponse,
  normalizedQuery: string,
): number | null {
  const values = getWorkspaceMemberSearchValues(member);

  if (values.some((value) => value === normalizedQuery)) {
    return 0;
  }

  if (values.some((value) => value.startsWith(normalizedQuery))) {
    return 1;
  }

  if (values.some((value) => value.includes(normalizedQuery))) {
    return 2;
  }

  return null;
}

function getWorkspaceMemberSearchValues(member: WorkspaceMemberResponse): string[] {
  return [member.displayName, member.email, member.userId]
    .filter((value): value is string => typeof value === "string")
    .map((value) => normalizeSearchValue(value))
    .filter((value) => value.length > 0);
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase();
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

function readRequiredNonEmptyString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new WorkspaceToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new WorkspaceToolInputError(`${propertyName} must not be empty.`);
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

function readOptionalBoundedInteger(
  record: Record<string, unknown>,
  propertyName: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new WorkspaceToolInputError(`${propertyName} must be an integer.`);
  }

  if (value < minimum || value > maximum) {
    throw new WorkspaceToolInputError(`${propertyName} must be between ${minimum} and ${maximum}.`);
  }

  return value;
}
