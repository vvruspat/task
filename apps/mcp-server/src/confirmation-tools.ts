import type {
  ConfirmationRequestDetailResponse,
  ConfirmationRequestSummaryResponse,
  ConfirmConfirmationRequestResponse,
  CreateConfirmationRequestInput,
  TaskBackendClient,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ConfirmationListPendingToolInput = {
  workspaceId: string;
  userId: string;
};

export type ConfirmationGetToolInput = {
  workspaceId: string;
  confirmationRequestId: string;
  userId: string;
};

export type ConfirmationCreateToolInput = {
  workspaceId: string;
  userId: string;
  agentRunId: string;
  kind: string;
  preview: Record<string, unknown>;
  expiresAt: string;
};

export type ConfirmationCancelToolInput = {
  workspaceId: string;
  confirmationRequestId: string;
  userId: string;
};

export type ConfirmationCommitToolInput = ConfirmationCancelToolInput;

export type ConfirmationToolHandlers = {
  listPending(input: unknown): Promise<ConfirmationRequestSummaryResponse[]>;
  get(input: unknown): Promise<ConfirmationRequestDetailResponse>;
  create(input: unknown): Promise<ConfirmationRequestDetailResponse>;
  cancel(input: unknown): Promise<ConfirmationRequestDetailResponse>;
  commit(input: unknown): Promise<ConfirmConfirmationRequestResponse>;
};

export class ConfirmationToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfirmationToolInputError";
  }
}

export function createConfirmationToolHandlers(
  client: TaskBackendClient,
): ConfirmationToolHandlers {
  return {
    listPending: (input) => {
      const parsedInput = parseConfirmationListPendingToolInput(input);

      return client.listPendingConfirmationRequests({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
      });
    },
    get: (input) => {
      const parsedInput = parseConfirmationGetToolInput(input);

      return client.getConfirmationRequest({
        workspaceId: parsedInput.workspaceId,
        confirmationRequestId: parsedInput.confirmationRequestId,
        userId: parsedInput.userId,
      });
    },
    create: (input) => {
      const parsedInput = parseConfirmationCreateToolInput(input);

      return client.createConfirmationRequest({
        workspaceId: parsedInput.workspaceId,
        userId: parsedInput.userId,
        body: toCreateConfirmationRequestInput(parsedInput),
      });
    },
    cancel: (input) => {
      const parsedInput = parseConfirmationCancelToolInput(input);

      return client.cancelConfirmationRequest({
        workspaceId: parsedInput.workspaceId,
        confirmationRequestId: parsedInput.confirmationRequestId,
        userId: parsedInput.userId,
      });
    },
    commit: (input) => {
      const parsedInput = parseConfirmationCommitToolInput(input);

      return client.confirmConfirmationRequest({
        workspaceId: parsedInput.workspaceId,
        confirmationRequestId: parsedInput.confirmationRequestId,
        userId: parsedInput.userId,
      });
    },
  };
}

export function parseConfirmationListPendingToolInput(
  input: unknown,
): ConfirmationListPendingToolInput {
  const record = readRecord(input, "confirmation list pending tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseConfirmationGetToolInput(input: unknown): ConfirmationGetToolInput {
  const record = readRecord(input, "confirmation get tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    confirmationRequestId: readRequiredUuid(record, "confirmationRequestId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseConfirmationCreateToolInput(input: unknown): ConfirmationCreateToolInput {
  const record = readRecord(input, "confirmation create tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    userId: readRequiredUuid(record, "userId"),
    agentRunId: readRequiredUuid(record, "agentRunId"),
    kind: readRequiredNonEmptyString(record, "kind"),
    preview: readRequiredRecord(record, "preview"),
    expiresAt: readRequiredDateTime(record, "expiresAt"),
  };
}

export function parseConfirmationCancelToolInput(input: unknown): ConfirmationCancelToolInput {
  const record = readRecord(input, "confirmation cancel tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    confirmationRequestId: readRequiredUuid(record, "confirmationRequestId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

export function parseConfirmationCommitToolInput(input: unknown): ConfirmationCommitToolInput {
  const record = readRecord(input, "confirmation commit tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    confirmationRequestId: readRequiredUuid(record, "confirmationRequestId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function toCreateConfirmationRequestInput(
  input: ConfirmationCreateToolInput,
): CreateConfirmationRequestInput {
  return {
    agentRunId: input.agentRunId,
    kind: input.kind,
    preview: input.preview,
    expiresAt: input.expiresAt,
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new ConfirmationToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = readRequiredNonEmptyString(record, propertyName);

  if (!uuidV4Pattern.test(value)) {
    throw new ConfirmationToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return value;
}

function readRequiredNonEmptyString(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new ConfirmationToolInputError(`${propertyName} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new ConfirmationToolInputError(`${propertyName} must not be empty.`);
  }

  return trimmedValue;
}

function readRequiredRecord(
  record: Record<string, unknown>,
  propertyName: string,
): Record<string, unknown> {
  const value = record[propertyName];

  if (!isUnknownRecord(value)) {
    throw new ConfirmationToolInputError(`${propertyName} must be an object.`);
  }

  return value;
}

function readRequiredDateTime(record: Record<string, unknown>, propertyName: string): string {
  const value = readRequiredNonEmptyString(record, propertyName);
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new ConfirmationToolInputError(`${propertyName} must be a date-time string.`);
  }

  return new Date(timestamp).toISOString();
}
