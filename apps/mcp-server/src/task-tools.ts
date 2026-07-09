import type {
  AddTaskSubtasksInput,
  CreateTaskInput,
  MoveTaskInput,
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
const maxSearchResultLimit = 20;

export type TaskSearchToolInput = {
  workspaceId: string;
  projectId: string;
  userId: string;
  query?: string;
  limit?: number;
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

export type TaskMoveToolInput = TaskGetToolInput & {
  parentTaskId: string | null;
  position: string;
};

export type TaskAddSubtaskToolInput = {
  title: string;
  description?: string | null;
  position?: string | null;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type TaskAddSubtasksToolInput = TaskGetToolInput & {
  subtasks: TaskAddSubtaskToolInput[];
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
  addSubtasks(input: unknown): Promise<TaskDetailResponse[]>;
  update(input: unknown): Promise<TaskDetailResponse>;
  move(input: unknown): Promise<TaskDetailResponse>;
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
    addSubtasks: (input) => {
      const parsedInput = parseTaskAddSubtasksToolInput(input);

      return client.addTaskSubtasks({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toAddTaskSubtasksInput(parsedInput),
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
    move: (input) => {
      const parsedInput = parseTaskMoveToolInput(input);

      return client.moveTask({
        workspaceId: parsedInput.workspaceId,
        projectId: parsedInput.projectId,
        taskId: parsedInput.taskId,
        userId: parsedInput.userId,
        body: toMoveTaskInput(parsedInput),
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

      const matchingTasks =
        parsedInput.query === undefined
          ? tasks
          : filterTasks(tasks, normalizeSearchText(parsedInput.query));

      return limitResults(matchingTasks, parsedInput.limit);
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

export function parseTaskMoveToolInput(input: unknown): TaskMoveToolInput {
  const record = readRecord(input, "task move tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    parentTaskId: readRequiredNullableUuid(record, "parentTaskId"),
    position: readRequiredNumericString(record, "position"),
  };
}

export function parseTaskAddSubtasksToolInput(input: unknown): TaskAddSubtasksToolInput {
  const record = readRecord(input, "task add subtasks tool input");
  const subtasks = readRequiredArray(record, "subtasks");

  if (subtasks.length === 0) {
    throw new TaskToolInputError("subtasks must include at least one subtask.");
  }

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
    subtasks: subtasks.map(parseTaskAddSubtaskToolInput),
  };
}

function parseTaskAddSubtaskToolInput(input: unknown): TaskAddSubtaskToolInput {
  const record = readRecord(input, "task add subtask tool input");
  const parsedInput: TaskAddSubtaskToolInput = {
    title: readRequiredNonEmptyString(record, "title"),
  };
  const description = readOptionalNullableString(record, "description");
  const position = readOptionalNullableNumericString(record, "position");
  const dueAt = readOptionalNullableDateTime(record, "dueAt");
  const metadata = readOptionalRecord(record, "metadata");

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
  const limit = readOptionalLimit(record, "limit");

  if (query !== undefined) {
    parsedInput.query = query;
  }

  if (limit !== undefined) {
    parsedInput.limit = limit;
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

function toAddTaskSubtasksInput(input: TaskAddSubtasksToolInput): AddTaskSubtasksInput {
  return {
    subtasks: input.subtasks.map((subtask) => {
      const bodySubtask: AddTaskSubtasksInput["subtasks"][number] = {
        title: subtask.title,
      };

      if (subtask.description !== undefined) {
        bodySubtask.description = subtask.description;
      }

      if (subtask.position !== undefined) {
        bodySubtask.position = subtask.position;
      }

      if (subtask.dueAt !== undefined) {
        bodySubtask.dueAt = subtask.dueAt;
      }

      if (subtask.metadata !== undefined) {
        bodySubtask.metadata = subtask.metadata;
      }

      return bodySubtask;
    }),
  };
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

function toMoveTaskInput(input: TaskMoveToolInput): MoveTaskInput {
  return {
    parentTaskId: input.parentTaskId,
    position: input.position,
  };
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

function limitResults<T>(items: T[], limit: number | undefined): T[] {
  if (limit === undefined) {
    return items;
  }

  return items.slice(0, limit);
}

type TaskSearchRank = 0 | 1 | 2;

type TaskSearchMatch = {
  task: TaskSummaryResponse;
  rank: TaskSearchRank;
};

function filterTasks(tasks: TaskSummaryResponse[], normalizedQuery: string): TaskSummaryResponse[] {
  return tasks
    .flatMap((task) => {
      const rank = readTaskSearchRank(normalizeSearchText(task.title), normalizedQuery);

      return rank === null ? [] : [{ task, rank }];
    })
    .sort(compareTaskSearchMatches)
    .map((match) => match.task);
}

function readTaskSearchRank(
  normalizedTitle: string,
  normalizedQuery: string,
): TaskSearchRank | null {
  if (normalizedTitle === normalizedQuery) {
    return 0;
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    return 1;
  }

  return normalizedTitle.includes(normalizedQuery) ? 2 : null;
}

function compareTaskSearchMatches(left: TaskSearchMatch, right: TaskSearchMatch): number {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }

  const leftTitle = normalizeSearchText(left.task.title);
  const rightTitle = normalizeSearchText(right.task.title);
  const titleComparison = leftTitle.localeCompare(rightTitle);

  return titleComparison === 0 ? left.task.id.localeCompare(right.task.id) : titleComparison;
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

function readRequiredArray(record: Record<string, unknown>, propertyName: string): unknown[] {
  const value = record[propertyName];

  if (!Array.isArray(value)) {
    throw new TaskToolInputError(`${propertyName} must be an array.`);
  }

  return value;
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
    throw new TaskToolInputError(`${propertyName} must be an integer.`);
  }

  if (value < 1 || value > maxSearchResultLimit) {
    throw new TaskToolInputError(`${propertyName} must be between 1 and ${maxSearchResultLimit}.`);
  }

  return value;
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

function readRequiredNumericString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new TaskToolInputError(`${propertyName} must be a numeric string.`);
  }

  const trimmedValue = value.trim();

  if (!numericStringPattern.test(trimmedValue)) {
    throw new TaskToolInputError(`${propertyName} must be a numeric string.`);
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
