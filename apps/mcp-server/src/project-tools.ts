import type {
  CreateProjectInput,
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

export type ProjectArchiveToolInput = ProjectGetToolInput;

export type ProjectCreateToolInput = {
  workspaceId: string;
  userId: string;
  title: string;
  description?: string | null;
  status?: string | null;
  position?: string | null;
};

export type ProjectToolHandlers = {
  search(input: unknown): Promise<ProjectSummaryResponse[]>;
  get(input: unknown): Promise<ProjectDetailResponse>;
  create(input: unknown): Promise<ProjectDetailResponse>;
  archive(input: unknown): Promise<ProjectDetailResponse>;
};

export class ProjectToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectToolInputError";
  }
}

export function createProjectToolHandlers(client: TaskBackendClient): ProjectToolHandlers {
  return {
    archive: (input) => {
      const parsedInput = parseProjectArchiveToolInput(input);

      return client.archiveProject({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        userId: parsedInput.userId,
      });
    },
    create: (input) => {
      const parsedInput = parseProjectCreateToolInput(input);

      return client.createProject({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
        body: toCreateProjectInput(parsedInput),
      });
    },
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

export function parseProjectCreateToolInput(input: unknown): ProjectCreateToolInput {
  const record = readRecord(input, "project create tool input");
  const parsedInput: ProjectCreateToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
    title: readRequiredNonEmptyString(record, "title"),
  };
  const description = readOptionalNullableNonEmptyString(record, "description");
  const status = readOptionalNullableNonEmptyString(record, "status");
  const position = readOptionalNullableNonEmptyString(record, "position");

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (status !== undefined) {
    parsedInput.status = status;
  }

  if (position !== undefined) {
    parsedInput.position = position;
  }

  return parsedInput;
}

export function parseProjectGetToolInput(input: unknown): ProjectGetToolInput {
  const record = readRecord(input, "project get tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseProjectArchiveToolInput(input: unknown): ProjectArchiveToolInput {
  const record = readRecord(input, "project archive tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function toCreateProjectInput(input: ProjectCreateToolInput): CreateProjectInput {
  const body: CreateProjectInput = {
    title: input.title,
  };

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.status !== undefined) {
    body.status = input.status;
  }

  if (input.position !== undefined) {
    body.position = input.position;
  }

  return body;
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

function readOptionalNullableNonEmptyString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];

  if (value === undefined || value === null) {
    return value;
  }

  return readRequiredNonEmptyString(record, propertyName);
}
