import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  mentionsTaskAgent,
  type TaskCommentAgentMentionHandler,
} from "./comment-agent-mention.service.js";
import type { CreateTaskCommentInput } from "./comments.contracts.js";
import { TaskCommentDto } from "./comments.dto.js";
import type { TaskCommentsStore } from "./comments.store.js";

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsStore: TaskCommentsStore,
    private readonly agentMentionHandler?: TaskCommentAgentMentionHandler,
  ) {}

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

    if (result.status === "invalid_reference") {
      throw new BadRequestException(
        "Reply target and mentioned users must belong to this task workspace.",
      );
    }

    if (this.agentMentionHandler !== undefined && mentionsTaskAgent(result.comment.body)) {
      await this.agentMentionHandler.handleMention({
        comment: result.comment,
        projectId,
        taskId,
        userId,
        workspaceId,
      });
    }

    return new TaskCommentDto(result.comment);
  }
}
