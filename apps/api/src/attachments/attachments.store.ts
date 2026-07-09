import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
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
};
