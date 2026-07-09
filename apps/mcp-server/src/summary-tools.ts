import type {
  TaskAttachmentResponse,
  TaskBackendClient,
  TaskCommentResponse,
  TaskDetailResponse,
} from "./backend-client.js";

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const recentItemLimit = 5;

export type TaskSummaryToolInput = {
  workspaceId: string;
  projectId: string;
  taskId: string;
  userId: string;
};

export type TaskSummaryTask = {
  id: string;
  workspaceId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  statusId: string | null;
  assigneeUserId: string | null;
  dueAt: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

export type TaskSummaryComment = {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};

export type TaskSummaryAttachment = {
  id: string;
  kind: TaskAttachmentResponse["kind"];
  title: string | null;
  url: string | null;
  storageKey: string | null;
  telegramFileId: string | null;
  mimeType: string | null;
  sizeBytes: string | null;
  createdAt: string;
};

export type TaskSummaryToolResponse = {
  task: TaskSummaryTask;
  counts: {
    comments: number;
    attachments: number;
  };
  recentComments: TaskSummaryComment[];
  recentAttachments: TaskSummaryAttachment[];
};

export type SummaryToolHandlers = {
  task(input: unknown): Promise<TaskSummaryToolResponse>;
};

export class SummaryToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryToolInputError";
  }
}

export function createSummaryToolHandlers(client: TaskBackendClient): SummaryToolHandlers {
  return {
    task: async (input) => {
      const parsedInput = parseTaskSummaryToolInput(input);
      const [task, comments, attachments] = await Promise.all([
        client.getTask({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
        client.listTaskComments({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
        client.listTaskAttachments({
          workspaceId: parsedInput.workspaceId,
          projectId: parsedInput.projectId,
          taskId: parsedInput.taskId,
          userId: parsedInput.userId,
        }),
      ]);

      return buildTaskSummary(task, comments, attachments);
    },
  };
}

export function parseTaskSummaryToolInput(input: unknown): TaskSummaryToolInput {
  const record = readRecord(input, "task summary tool input");

  return {
    workspaceId: readRequiredUuid(record, "workspaceId"),
    projectId: readRequiredUuid(record, "projectId"),
    taskId: readRequiredUuid(record, "taskId"),
    userId: readRequiredUuid(record, "userId"),
  };
}

function buildTaskSummary(
  task: TaskDetailResponse,
  comments: TaskCommentResponse[],
  attachments: TaskAttachmentResponse[],
): TaskSummaryToolResponse {
  return {
    task: {
      id: task.id,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId ?? null,
      title: task.title,
      description: task.description ?? null,
      statusId: task.statusId ?? null,
      assigneeUserId: task.assigneeUserId ?? null,
      dueAt: task.dueAt ?? null,
      archivedAt: task.archivedAt ?? null,
      updatedAt: task.updatedAt,
    },
    counts: {
      comments: comments.length,
      attachments: attachments.length,
    },
    recentComments: comments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, recentItemLimit)
      .map(toTaskSummaryComment),
    recentAttachments: attachments
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, recentItemLimit)
      .map(toTaskSummaryAttachment),
  };
}

function toTaskSummaryComment(comment: TaskCommentResponse): TaskSummaryComment {
  return {
    id: comment.id,
    authorUserId: comment.authorUserId,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

function toTaskSummaryAttachment(attachment: TaskAttachmentResponse): TaskSummaryAttachment {
  return {
    id: attachment.id,
    kind: attachment.kind,
    title: attachment.title ?? null,
    url: attachment.url ?? null,
    storageKey: attachment.storageKey ?? null,
    telegramFileId: attachment.telegramFileId ?? null,
    mimeType: attachment.mimeType ?? null,
    sizeBytes: attachment.sizeBytes ?? null,
    createdAt: attachment.createdAt,
  };
}

function readRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isUnknownRecord(value)) {
    throw new SummaryToolInputError(`${label} must be an object.`);
  }

  return value;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredUuid(record: Record<string, unknown>, propertyName: string): string {
  const value = record[propertyName];

  if (typeof value !== "string") {
    throw new SummaryToolInputError(`${propertyName} must be a string.`);
  }
  const trimmedValue = value.trim();

  if (!uuidV4Pattern.test(trimmedValue)) {
    throw new SummaryToolInputError(`${propertyName} must be a UUID v4 string.`);
  }

  return trimmedValue;
}
