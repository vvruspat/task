import type { TaskBackendClient, TaskSummaryResponse } from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TaskSearchToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  query?: string;
};

export type TaskToolHandlers = {
  search(input: unknown): Promise<TaskSummaryResponse[]>;
};

export class TaskToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskToolInputError";
  }
}

export function createTaskToolHandlers(client: TaskBackendClient): TaskToolHandlers {
  return {
    search: async (input) => {
      const parsedInput = parseTaskSearchToolInput(input);
      const tasks = await client.listActiveTasks({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        userId: parsedInput.userId,
      });

      if (parsedInput.query === undefined) {
        return tasks;
      }

      const normalizedQuery = normalizeSearchText(parsedInput.query);

      return tasks.filter((task) => normalizeSearchText(task.title).includes(normalizedQuery));
    },
  };
}

export function parseTaskSearchToolInput(input: unknown): TaskSearchToolInput {
  const record = readRecord(input, "task search tool input");
  const parsedInput: TaskSearchToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
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
    throw new TaskToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = readRequiredNonEmptyString(record, propertyName);

  if (!uuidV4Pattern.test(value)) {
    throw new TaskToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return value;
}

function readRequiredNonEmptyString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new TaskToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new TaskToolInputError(`${propertyName} must not be empty.`);
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
