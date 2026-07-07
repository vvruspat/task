import type {
  ApplyTaskSkillResponse,
  PreviewTaskSkillApplyInput,
  PreviewTaskSkillApplyResponse,
  TaskBackendClient,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export type TaskSkillToolHandlers = {
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
