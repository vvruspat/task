import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateTaskCommentInput } from "./comments.contracts.js";
import { TaskCommentDto } from "./comments.dto.js";
import type { TaskCommentsStore } from "./comments.store.js";

@Injectable()
export class CommentsService {
  constructor(private readonly commentsStore: TaskCommentsStore) {}

  async listTaskComments(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskCommentDto[]> {
    const comments = await this.commentsStore.listForTask(workspaceId, projectId, taskId, userId);

    if (comments === null) {
      throw new NotFoundException("Task was not found.");
    }

    return comments.map((comment) => new TaskCommentDto(comment));
  }

  async createTaskComment(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: CreateTaskCommentInput,
  ): Promise<TaskCommentDto> {
    const result = await this.commentsStore.createForTask(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );

    if (result.status === "task_not_found") {
      throw new NotFoundException("Task was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot comment on tasks in this workspace.");
    }

    return new TaskCommentDto(result.comment);
  }
}
