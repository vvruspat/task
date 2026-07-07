import type {
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ProjectSearchToolInput = {
  workspaceId: string;
  userId: string;
  query?: string;
};

export type ProjectGetToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
};

export type ProjectToolHandlers = {
  search(input: unknown): Promise<ProjectSummaryResponse[]>;
  get(input: unknown): Promise<ProjectDetailResponse>;
};

export class ProjectToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectToolInputError";
  }
}

export function createProjectToolHandlers(client: TaskBackendClient): ProjectToolHandlers {
  return {
    get: (input) => {
      const parsedInput = parseProjectGetToolInput(input);

      return client.getProject({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        userId: parsedInput.userId,
      });
    },
    search: async (input) => {
      const parsedInput = parseProjectSearchToolInput(input);
      const projects = await client.listActiveProjects({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });

      if (parsedInput.query === undefined) {
        return projects;
      }

      const normalizedQuery = normalizeSearchText(parsedInput.query);

      return projects.filter((project) =>
        normalizeSearchText(project.title).includes(normalizedQuery),
      );
    },
  };
}

export function parseProjectGetToolInput(input: unknown): ProjectGetToolInput {
  const record = readRecord(input, "project get tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseProjectSearchToolInput(input: unknown): ProjectSearchToolInput {
  const record = readRecord(input, "project search tool input");
  const parsedInput: ProjectSearchToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
  };
  const query = readOptionalNonEmptyString(record, "query");

  if (query !== undefined) {
    parsedInput.query = query;
  }

  return parsedInput;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new ProjectToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = readRequiredNonEmptyString(record, propertyName);

  if (!uuidV4Pattern.test(value)) {
    throw new ProjectToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return value;
}

function readRequiredNonEmptyString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new ProjectToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new ProjectToolInputError(`${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readOptionalNonEmptyString(
  record: Record<string, unknown>,
  propertyName: string,
): string | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  return readRequiredNonEmptyString(record, propertyName);
}
