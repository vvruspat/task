import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
  TaskAttachment,
} from "./attachments.contracts.js";

export type TaskAttachmentCreateResult =
  | {
      attachment: TaskAttachment;
      status: "created";
    }
  | {
      status: "task_not_found";
    }
  | {
      status: "forbidden";
    };

export type TaskAttachmentsStore = {
  authorizeFileUpload(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<"allowed" | "forbidden" | "task_not_found">;
  listForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskAttachment[] | null>;
  createLinkForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskLinkAttachmentInput,
  ): Promise<TaskAttachmentCreateResult>;
  createFileForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskFileAttachmentInput,
  ): Promise<TaskAttachmentCreateResult>;
  createTelegramFileForTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskTelegramFileAttachmentInput,
  ): Promise<TaskAttachmentCreateResult>;
};
