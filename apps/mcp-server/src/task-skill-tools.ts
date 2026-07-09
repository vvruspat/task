import type {
  ApplyTaskSkillResponse,
  ArchiveTaskSkillResponse,
  CloneTaskSkillInput,
  CloneTaskSkillResponse,
  CreateTaskSkillInput,
  CreateTaskSkillResponse,
  PreviewTaskSkillApplyInput,
  PreviewTaskSkillApplyResponse,
  TaskBackendClient,
  TaskSkillDetailResponse,
  TaskSkillSummaryResponse,
  UpdateTaskSkillDefinitionResponse,
  UpdateTaskSkillMetadataInput,
  UpdateTaskSkillMetadataResponse,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxSearchResultLimit = 20;

export type TaskSkillApplyToolInput = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  projectId: string;
  rootTaskTitle: string;
  overrides?: {
    removeSubtasks?: string[];
    addSubtasks?: string[];
  };
};

export type TaskSkillSearchToolInput = {
  workspaceId: string;
  userId: string;
  query?: string;
  limit?: number;
};

export type TaskSkillGetToolInput = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
};

export type TaskSkillArchiveToolInput = TaskSkillGetToolInput;

export type TaskSkillCloneToolInput = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  name: string;
  description?: string | null;
  aliases?: string[];
};

export type TaskSkillCreateToolInput = {
  workspaceId: string;
  userId: string;
  name: string;
  description?: string | null;
  aliases?: string[];
  definition: Record<string, unknown>;
};

export type TaskSkillUpdateMetadataToolInput = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  name?: string;
  description?: string | null;
  aliases?: string[];
};

export type TaskSkillUpdateDefinitionToolInput = {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  definition: Record<string, unknown>;
};

export type TaskSkillToolHandlers = {
  search(input: unknown): Promise<TaskSkillSummaryResponse[]>;
  get(input: unknown): Promise<TaskSkillDetailResponse>;
  create(input: unknown): Promise<CreateTaskSkillResponse>;
  clone(input: unknown): Promise<CloneTaskSkillResponse>;
  archive(input: unknown): Promise<ArchiveTaskSkillResponse>;
  updateMetadata(input: unknown): Promise<UpdateTaskSkillMetadataResponse>;
  updateDefinition(input: unknown): Promise<UpdateTaskSkillDefinitionResponse>;
  previewApply(input: unknown): Promise<PreviewTaskSkillApplyResponse>;
  apply(input: unknown): Promise<ApplyTaskSkillResponse>;
};

export class TaskSkillToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskSkillToolInputError";
  }
}

export function createTaskSkillToolHandlers(client: TaskBackendClient): TaskSkillToolHandlers {
  return {
    search: async (input) => {
      const parsedInput = parseTaskSkillSearchToolInput(input);
      const skills = await client.listTaskSkills({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });

      const matchingSkills =
        parsedInput.query === undefined
          ? skills
          : filterSkills(skills, normalizeSearchText(parsedInput.query));

      return limitResults(matchingSkills, parsedInput.limit);
    },
    get: (input) => {
      const parsedInput = parseTaskSkillGetToolInput(input);

      return client.getTaskSkill({
        workspaceId: parsedInput.workspaceId,
        taskSkillId: parsedInput.taskSkillId,
        userId: parsedInput.userId,
      });
    },
    create: (input) => {
      const parsedInput = parseTaskSkillCreateToolInput(input);

      return client.createTaskSkill({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
        body: toCreateTaskSkillInput(parsedInput),
      });
    },
    clone: (input) => {
      const parsedInput = parseTaskSkillCloneToolInput(input);

      return client.cloneTaskSkill({
        workspaceId: parsedInput.workspaceId,
        taskSkillId: parsedInput.taskSkillId,
        userId: parsedInput.userId,
        body: toCloneTaskSkillInput(parsedInput),
      });
    },
    archive: (input) => {
      const parsedInput = parseTaskSkillArchiveToolInput(input);

      return client.archiveTaskSkill({
        workspaceId: parsedInput.workspaceId,
        taskSkillId: parsedInput.taskSkillId,
        userId: parsedInput.userId,
      });
    },
    updateMetadata: (input) => {
      const parsedInput = parseTaskSkillUpdateMetadataToolInput(input);

      return client.updateTaskSkillMetadata({
        workspaceId: parsedInput.workspaceId,
        taskSkillId: parsedInput.taskSkillId,
        userId: parsedInput.userId,
        body: toUpdateTaskSkillMetadataInput(parsedInput),
      });
    },
    updateDefinition: (input) => {
      const parsedInput = parseTaskSkillUpdateDefinitionToolInput(input);

      return client.updateTaskSkillDefinition({
        workspaceId: parsedInput.workspaceId,
        taskSkillId: parsedInput.taskSkillId,
        userId: parsedInput.userId,
        body: {
          definition: parsedInput.definition,
        },
      });
    },
    previewApply: (input) => {
      const parsedInput = parseTaskSkillApplyToolInput(input);

      return client.previewTaskSkillApply(toBackendRequest(parsedInput));
    },
    apply: (input) => {
      const parsedInput = parseTaskSkillApplyToolInput(input);

      return client.applyTaskSkill(toBackendRequest(parsedInput));
    },
  };
}

export function parseTaskSkillSearchToolInput(input: unknown): TaskSkillSearchToolInput {
  const record = readRecord(input, "task skill search tool input");
  const parsedInput: TaskSkillSearchToolInput = {
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

export function parseTaskSkillGetToolInput(input: unknown): TaskSkillGetToolInput {
  const record = readRecord(input, "task skill get tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseTaskSkillCreateToolInput(input: unknown): TaskSkillCreateToolInput {
  const record = readRecord(input, "task skill create tool input");
  const parsedInput: TaskSkillCreateToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
    name: readRequiredNonEmptyString(record, "name"),
    definition: readRequiredRecord(record, "definition"),
  };
  const description = readOptionalNullableString(record, "description");
  const aliases = readOptionalStringArray(record, "aliases");

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (aliases !== undefined) {
    parsedInput.aliases = aliases;
  }

  return parsedInput;
}

export function parseTaskSkillCloneToolInput(input: unknown): TaskSkillCloneToolInput {
  const record = readRecord(input, "task skill clone tool input");
  const parsedInput: TaskSkillCloneToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
    name: readRequiredNonEmptyString(record, "name"),
  };
  const description = readOptionalNullableString(record, "description");
  const aliases = readOptionalStringArray(record, "aliases");

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (aliases !== undefined) {
    parsedInput.aliases = aliases;
  }

  return parsedInput;
}

export function parseTaskSkillArchiveToolInput(input: unknown): TaskSkillArchiveToolInput {
  const record = readRecord(input, "task skill archive tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseTaskSkillUpdateMetadataToolInput(
  input: unknown,
): TaskSkillUpdateMetadataToolInput {
  const record = readRecord(input, "task skill update metadata tool input");
  const parsedInput: TaskSkillUpdateMetadataToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
  };

  if ("name" in record) {
    parsedInput.name = readRequiredNonEmptyString(record, "name");
  }

  if ("description" in record) {
    const description = readOptionalNullableString(record, "description");

    if (description !== undefined) {
      parsedInput.description = description;
    }
  }

  if ("aliases" in record) {
    const aliases = readOptionalStringArray(record, "aliases");

    if (aliases !== undefined) {
      parsedInput.aliases = aliases;
    }
  }

  if (
    parsedInput.name === undefined &&
    parsedInput.description === undefined &&
    parsedInput.aliases === undefined
  ) {
    throw new TaskSkillToolInputError(
      "task skill update metadata tool input must include a metadata field.",
    );
  }

  return parsedInput;
}

export function parseTaskSkillUpdateDefinitionToolInput(
  input: unknown,
): TaskSkillUpdateDefinitionToolInput {
  const record = readRecord(input, "task skill update definition tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
    definition: readRequiredRecord(record, "definition"),
  };
}

export function parseTaskSkillApplyToolInput(input: unknown): TaskSkillApplyToolInput {
  const record = readRecord(input, "task skill apply tool input");
  const parsedInput: TaskSkillApplyToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    taskSkillId: readRequiredUuid(record, "taskSkillId"),
    userId: readRequiredUuid(record, "userId"),
    projectId: readRequiredUuid(record, "projectId"),
    rootTaskTitle: readRequiredNonEmptyString(record, "rootTaskTitle"),
  };
  const overrides = readOptionalOverrides(record, "overrides");

  if (overrides !== undefined) {
    parsedInput.overrides = overrides;
  }

  return parsedInput;
}

function toBackendRequest(input: TaskSkillApplyToolInput): {
  workspaceId: string;
  taskSkillId: string;
  userId: string;
  body: PreviewTaskSkillApplyInput;
} {
  const body: PreviewTaskSkillApplyInput = {
    projectId: input.projectId,
    rootTaskTitle: input.rootTaskTitle,
  };

  if (input.overrides !== undefined) {
    body.overrides = input.overrides;
  }

  return {
    workspaceId: input.workspaceId,
    taskSkillId: input.taskSkillId,
    userId: input.userId,
    body,
  };
}

function toCreateTaskSkillInput(input: TaskSkillCreateToolInput): CreateTaskSkillInput {
  const body: CreateTaskSkillInput = {
    name: input.name,
    definition: input.definition,
  };

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.aliases !== undefined) {
    body.aliases = input.aliases;
  }

  return body;
}

function toCloneTaskSkillInput(input: TaskSkillCloneToolInput): CloneTaskSkillInput {
  const body: CloneTaskSkillInput = {
    name: input.name,
  };

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.aliases !== undefined) {
    body.aliases = input.aliases;
  }

  return body;
}

function toUpdateTaskSkillMetadataInput(
  input: TaskSkillUpdateMetadataToolInput,
): UpdateTaskSkillMetadataInput {
  const body: UpdateTaskSkillMetadataInput = {};

  if (input.name !== undefined) {
    body.name = input.name;
  }

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.aliases !== undefined) {
    body.aliases = input.aliases;
  }

  return body;
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new TaskSkillToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = readRequiredNonEmptyString(record, propertyName);

  if (!uuidV4Pattern.test(value)) {
    throw new TaskSkillToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return value;
}

function readRequiredNonEmptyString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new TaskSkillToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new TaskSkillToolInputError(`${propertyName} must not be empty.`);
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

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
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
    throw new TaskSkillToolInputError(`${propertyName} must be an integer.`);
  }

  if (value < 1 || value > maxSearchResultLimit) {
    throw new TaskSkillToolInputError(
      `${propertyName} must be between 1 and ${maxSearchResultLimit}.`,
    );
  }

  return value;
}

function filterSkills(
  skills: TaskSkillSummaryResponse[],
  normalizedQuery: string,
): TaskSkillSummaryResponse[] {
  return skills
    .flatMap((skill) => {
      const rank = readBestSkillSearchRank(skill, normalizedQuery);

      return rank === null ? [] : [{ skill, rank }];
    })
    .sort((left, right) => compareSkillMatches(left, right))
    .map((match) => match.skill);
}

function compareSkillMatches(left: TaskSkillSearchMatch, right: TaskSkillSearchMatch): number {
  if (left.rank.match !== right.rank.match) {
    return left.rank.match - right.rank.match;
  }

  if (left.rank.field !== right.rank.field) {
    return left.rank.field - right.rank.field;
  }

  const nameComparison = normalizeSearchText(left.skill.name).localeCompare(
    normalizeSearchText(right.skill.name),
  );

  return nameComparison === 0 ? left.skill.id.localeCompare(right.skill.id) : nameComparison;
}

function readBestSkillSearchRank(
  skill: TaskSkillSummaryResponse,
  normalizedQuery: string,
): SkillSearchRank | null {
  let bestRank: SkillSearchRank | null = null;
  const values: SkillSearchValue[] = [
    { value: skill.name, field: 0 },
    ...skill.aliases.map((alias) => ({ value: alias, field: 1 }) satisfies SkillSearchValue),
  ];

  for (const { value, field } of values) {
    const match = readSearchMatchRank(normalizeSearchText(value), normalizedQuery);

    if (match !== null) {
      const rank = { match, field };

      if (bestRank === null || compareSkillSearchRanks(rank, bestRank) < 0) {
        bestRank = rank;
      }
    }
  }

  return bestRank;
}

function compareSkillSearchRanks(left: SkillSearchRank, right: SkillSearchRank): number {
  if (left.match !== right.match) {
    return left.match - right.match;
  }

  return left.field - right.field;
}

function readSearchMatchRank(normalizedValue: string, normalizedQuery: string): MatchRank | null {
  if (normalizedValue === normalizedQuery) {
    return 0;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 1;
  }

  return normalizedValue.includes(normalizedQuery) ? 2 : null;
}

type TaskSkillSearchMatch = {
  skill: TaskSkillSummaryResponse;
  rank: SkillSearchRank;
};

type SkillSearchRank = {
  match: MatchRank;
  field: SkillSearchFieldRank;
};

type SkillSearchValue = {
  value: string;
  field: SkillSearchFieldRank;
};

type MatchRank = 0 | 1 | 2;
type SkillSearchFieldRank = 0 | 1;

function limitResults<T>(items: T[], limit: number | undefined): T[] {
  if (limit === undefined) {
    return items;
  }

  return items.slice(0, limit);
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function readRequiredRecord(
  record: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const value = record[propertyName];

  return readRecord(value, propertyName);
}

function readOptionalOverrides(
  record: Record<string, unknown>,
  propertyName: string,
): TaskSkillApplyToolInput["overrides"] | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  const overridesRecord = readRecord(value, propertyName);
  const removeSubtasks = readOptionalStringArray(overridesRecord, "removeSubtasks");
  const addSubtasks = readOptionalStringArray(overridesRecord, "addSubtasks");
  const overrides: NonNullable<TaskSkillApplyToolInput["overrides"]> = {};

  if (removeSubtasks !== undefined) {
    overrides.removeSubtasks = removeSubtasks;
  }

  if (addSubtasks !== undefined) {
    overrides.addSubtasks = addSubtasks;
  }

  return overrides;
}

function readOptionalStringArray(
  record: Record<string, unknown>,
  propertyName: string,
): string[] | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new TaskSkillToolInputError(`${propertyName} must be an array of strings.`);
  }

  const strings = value.map((item) => {
    if (typeof item !== "string") {
      throw new TaskSkillToolInputError(`${propertyName} must be an array of strings.`);
    }

    const trimmedItem = item.trim();

    if (trimmedItem.length === 0) {
      throw new TaskSkillToolInputError(`${propertyName} must not contain empty values.`);
    }

    return trimmedItem;
  });

  return [...new Set(strings)];
}
