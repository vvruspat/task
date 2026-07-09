import type {
  CreateProjectInput,
  ProjectDetailResponse,
  ProjectSummaryResponse,
  TaskBackendClient,
  UpdateProjectInput,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxSearchResultLimit = 20;

export type ProjectSearchToolInput = {
  workspaceId: string;
  userId: string;
  query?: string;
  limit?: number;
};

export type ProjectGetToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
};

export type ProjectArchiveToolInput = ProjectGetToolInput;

export type ProjectUpdateToolInput = ProjectGetToolInput & {
  title?: string;
  description?: string | null;
  status?: string | null;
  position?: string | null;
};

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
  update(input: unknown): Promise<ProjectDetailResponse>;
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
    update: (input) => {
      const parsedInput = parseProjectUpdateToolInput(input);

      return client.updateProject({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        userId: parsedInput.userId,
        body: toUpdateProjectInput(parsedInput),
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

      const matchingProjects =
        parsedInput.query === undefined
          ? projects
          : filterProjects(projects, normalizeSearchText(parsedInput.query));

      return limitResults(matchingProjects, parsedInput.limit);
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

export function parseProjectUpdateToolInput(input: unknown): ProjectUpdateToolInput {
  const record = readRecord(input, "project update tool input");
  const parsedInput: ProjectUpdateToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
  };
  const title = readOptionalNonEmptyString(record, "title");
  const description = readOptionalNullableNonEmptyString(record, "description");
  const status = readOptionalNullableNonEmptyString(record, "status");
  const position = readOptionalNullableNonEmptyString(record, "position");

  if (title !== undefined) {
    parsedInput.title = title;
  }

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (status !== undefined) {
    parsedInput.status = status;
  }

  if (position !== undefined) {
    parsedInput.position = position;
  }

  if (
    title === undefined &&
    description === undefined &&
    status === undefined &&
    position === undefined
  ) {
    throw new ProjectToolInputError("project update tool input must include at least one field.");
  }

  return parsedInput;
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

function toUpdateProjectInput(input: ProjectUpdateToolInput): UpdateProjectInput {
  const body: UpdateProjectInput = {};

  if (input.title !== undefined) {
    body.title = input.title;
  }

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
  const limit = readOptionalLimit(record, "limit");

  if (query !== undefined) {
    parsedInput.query = query;
  }

  if (limit !== undefined) {
    parsedInput.limit = limit;
  }

  return parsedInput;
}

function limitResults<T>(items: T[], limit: number | undefined): T[] {
  if (limit === undefined) {
    return items;
  }

  return items.slice(0, limit);
}

function filterProjects(
  projects: ProjectSummaryResponse[],
  normalizedQuery: string,
): ProjectSummaryResponse[] {
  return projects
    .flatMap((project) => {
      const rank = readSearchRank(normalizeSearchText(project.title), normalizedQuery);

      return rank === null ? [] : [{ project, rank }];
    })
    .sort((left, right) => compareProjectMatches(left, right))
    .map((match) => match.project);
}

function compareProjectMatches(left: ProjectSearchMatch, right: ProjectSearchMatch): number {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }

  const titleComparison = normalizeSearchText(left.project.title).localeCompare(
    normalizeSearchText(right.project.title),
  );

  return titleComparison === 0 ? left.project.id.localeCompare(right.project.id) : titleComparison;
}

function readSearchRank(normalizedValue: string, normalizedQuery: string): SearchRank | null {
  if (normalizedValue === normalizedQuery) {
    return 0;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 1;
  }

  return normalizedValue.includes(normalizedQuery) ? 2 : null;
}

type ProjectSearchMatch = {
  project: ProjectSummaryResponse;
  rank: SearchRank;
};

type SearchRank = 0 | 1 | 2;

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

function readOptionalLimit(
  record: Record<string, unknown>,
  propertyName: string,
): number | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ProjectToolInputError(`${propertyName} must be an integer.`);
  }

  if (value < 1 || value > maxSearchResultLimit) {
    throw new ProjectToolInputError(
      `${propertyName} must be between 1 and ${maxSearchResultLimit}.`,
    );
  }

  return value;
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
