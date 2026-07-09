import type {
  CreateTaskInput,
  TaskBackendClient,
  TaskDetailResponse,
  TaskSummaryResponse,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const numericStringPattern = /^-?\d+(\.\d+)?$/;

export type TaskSearchToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  query?: string;
};

export type TaskGetToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type TaskArchiveToolInput = TaskGetToolInput;

export type TaskUpdateToolInput = TaskGetToolInput & {
  title?: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export type TaskCreateToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  title: string;
  parentTaskId?: string | null;
  description?: string | null;
  position?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type TaskSetStatusToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  statusId: string | null;
};

export type TaskSetAssigneeToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  assigneeUserId: string | null;
};

export type TaskSetDueDateToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
  dueAt: string | null;
};

export type TaskToolHandlers = {
  archive(input: unknown): Promise<TaskDetailResponse>;
  create(input: unknown): Promise<TaskDetailResponse>;
  update(input: unknown): Promise<TaskDetailResponse>;
  setStatus(input: unknown): Promise<TaskDetailResponse>;
  setAssignee(input: unknown): Promise<TaskDetailResponse>;
  setDueDate(input: unknown): Promise<TaskDetailResponse>;
  search(input: unknown): Promise<TaskSummaryResponse[]>;
  get(input: unknown): Promise<TaskDetailResponse>;
};

export class TaskToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskToolInputError";
  }
}

export function createTaskToolHandlers(client: TaskBackendClient): TaskToolHandlers {
  return {
    archive: (input) => {
      const parsedInput = parseTaskArchiveToolInput(input);

      return client.archiveTask({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
      });
    },
    create: (input) => {
      const parsedInput = parseTaskCreateToolInput(input);

      return client.createTask({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        userId: parsedInput.userId,
        body: toCreateTaskInput(parsedInput),
      });
    },
    update: (input) => {
      const parsedInput = parseTaskUpdateToolInput(input);

      return client.updateTask({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toUpdateTaskInput(parsedInput),
      });
    },
    setStatus: (input) => {
      const parsedInput = parseTaskSetStatusToolInput(input);

      return client.updateTaskStatus({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toUpdateTaskStatusInput(parsedInput),
      });
    },
    setAssignee: (input) => {
      const parsedInput = parseTaskSetAssigneeToolInput(input);

      return client.updateTaskAssignee({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toUpdateTaskAssigneeInput(parsedInput),
      });
    },
    setDueDate: (input) => {
      const parsedInput = parseTaskSetDueDateToolInput(input);

      return client.updateTaskDueDate({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toUpdateTaskDueDateInput(parsedInput),
      });
    },
    get: (input) => {
      const parsedInput = parseTaskGetToolInput(input);

      return client.getTask({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
      });
    },
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

export function parseTaskSetStatusToolInput(input: unknown): TaskSetStatusToolInput {
  const record = readRecord(input, "task set status tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    statusId: readRequiredNullableUuid(record, "statusId"),
  };
}

export function parseTaskSetAssigneeToolInput(input: unknown): TaskSetAssigneeToolInput {
  const record = readRecord(input, "task set assignee tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    assigneeUserId: readRequiredNullableUuid(record, "assigneeUserId"),
  };
}

export function parseTaskSetDueDateToolInput(input: unknown): TaskSetDueDateToolInput {
  const record = readRecord(input, "task set due date tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    dueAt: readRequiredNullableDateTime(record, "dueAt"),
  };
}

export function parseTaskCreateToolInput(input: unknown): TaskCreateToolInput {
  const record = readRecord(input, "task create tool input");
  const parsedInput: TaskCreateToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    userId: readRequiredUuid(record, "userId"),
    title: readRequiredNonEmptyString(record, "title"),
  };
  const parentTaskId = readOptionalNullableUuid(record, "parentTaskId");
  const description = readOptionalNullableString(record, "description");
  const position = readOptionalNullableNumericString(record, "position");
  const dueAt = readOptionalNullableDateTime(record, "dueAt");
  const metadata = readOptionalRecord(record, "metadata");

  if (parentTaskId !== undefined) {
    parsedInput.parentTaskId = parentTaskId;
  }

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (position !== undefined) {
    parsedInput.position = position;
  }

  if (dueAt !== undefined) {
    parsedInput.dueAt = dueAt;
  }

  if (metadata !== undefined) {
    parsedInput.metadata = metadata;
  }

  return parsedInput;
}

export function parseTaskUpdateToolInput(input: unknown): TaskUpdateToolInput {
  const record = readRecord(input, "task update tool input");
  const parsedInput: TaskUpdateToolInput = {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
  const title = readOptionalNonEmptyString(record, "title");
  const description = readOptionalNullableString(record, "description");
  const metadata = readOptionalRecord(record, "metadata");

  if (title !== undefined) {
    parsedInput.title = title;
  }

  if (description !== undefined) {
    parsedInput.description = description;
  }

  if (metadata !== undefined) {
    parsedInput.metadata = metadata;
  }

  if (title === undefined && description === undefined && metadata === undefined) {
    throw new TaskToolInputError("task update tool input must include at least one field.");
  }

  return parsedInput;
}

export function parseTaskGetToolInput(input: unknown): TaskGetToolInput {
  const record = readRecord(input, "task get tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseTaskArchiveToolInput(input: unknown): TaskArchiveToolInput {
  const record = readRecord(input, "task archive tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
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

function toCreateTaskInput(input: TaskCreateToolInput): CreateTaskInput {
  const body: CreateTaskInput = {
    title: input.title,
  };

  if (input.parentTaskId !== undefined) {
    body.parentTaskId = input.parentTaskId;
  }

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.position !== undefined) {
    body.position = input.position;
  }

  if (input.dueAt !== undefined) {
    body.dueAt = input.dueAt;
  }

  if (input.metadata !== undefined) {
    body.metadata = input.metadata;
  }

  return body;
}

function toUpdateTaskInput(input: TaskUpdateToolInput): UpdateTaskInput {
  const body: UpdateTaskInput = {};

  if (input.title !== undefined) {
    body.title = input.title;
  }

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.metadata !== undefined) {
    body.metadata = input.metadata;
  }

  return body;
}

function toUpdateTaskStatusInput(input: TaskSetStatusToolInput): UpdateTaskStatusInput {
  return {
    statusId: input.statusId,
  };
}

function toUpdateTaskAssigneeInput(input: TaskSetAssigneeToolInput): UpdateTaskAssigneeInput {
  return {
    assigneeUserId: input.assigneeUserId,
  };
}

function toUpdateTaskDueDateInput(input: TaskSetDueDateToolInput): UpdateTaskDueDateInput {
  return {
    dueAt: input.dueAt,
  };
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

function readOptionalNullableString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = record[propertyName];

  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== "string") {
    throw new TaskToolInputError(`${propertyName} must be a string or null.`);
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function readOptionalNullableUuid(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = readOptionalNullableString(record, propertyName);

  if (value === undefined || value === null) {
    return value;
  }

  if (!uuidV4Pattern.test(value)) {
    throw new TaskToolInputError(`${propertyName} must be a UUID v4 string or null.`);
  }

  return value;
}

function readRequiredNullableUuid(
  record: Record<string, unknown>,
  propertyName: string,
): string | null {
  const value = record[propertyName];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new TaskToolInputError(`${propertyName} must be a UUID v4 string or null.`);
  }

  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new TaskToolInputError(`${propertyName} must be a UUID v4 string or null.`);
  }

  return trimmedValue;
}

function readRequiredNullableDateTime(
  record: Record<string, unknown>,
  propertyName: string,
): string | null {
  const value = record[propertyName];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new TaskToolInputError(`${propertyName} must be a datetime string or null.`);
  }

  const trimmedValue = value.trim();
  const date = new Date(trimmedValue);

  if (trimmedValue.length === 0 || Number.isNaN(date.getTime())) {
    throw new TaskToolInputError(`${propertyName} must be a datetime string or null.`);
  }

  return date.toISOString();
}

function readOptionalNullableNumericString(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = readOptionalNullableString(record, propertyName);

  if (value === undefined || value === null) {
    return value;
  }

  if (!numericStringPattern.test(value)) {
    throw new TaskToolInputError(`${propertyName} must be a numeric string or null.`);
  }

  return value;
}

function readOptionalNullableDateTime(
  record: Record<string, unknown>,
  propertyName: string,
): string | null | undefined {
  const value = readOptionalNullableString(record, propertyName);

  if (value === undefined || value === null) {
    return value;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new TaskToolInputError(`${propertyName} must be an ISO date-time string or null.`);
  }

  return new Date(timestamp).toISOString();
}

function readOptionalRecord(
  record: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> | undefined {
  const value = record[propertyName];

  if (value === undefined) {
    return undefined;
  }

  if (!isUnknownRecord(value)) {
    throw new TaskToolInputError(`${propertyName} must be an object.`);
  }

  return value;
}
