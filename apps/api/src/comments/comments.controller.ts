import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type { CreateTaskCommentInput } from "./comments.contracts.js";
import {
  CreateTaskCommentDto,
  ParseCreateTaskCommentBodyPipe,
  TaskCommentDto,
} from "./comments.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { CommentsService } from "./comments.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("comments")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: "List comments for a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiOkResponse({ isArray: true, type: TaskCommentDto })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  listTaskComments(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskCommentDto[]> {
    return this.commentsService.listTaskComments(workspaceId, projectId, taskId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a comment on a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: CreateTaskCommentDto })
  @ApiCreatedResponse({ type: TaskCommentDto })
  @ApiBadRequestResponse({ description: "Comment payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot comment on tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  createTaskComment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskCommentBodyPipe()) input: CreateTaskCommentInput,
  ): Promise<TaskCommentDto> {
    return this.commentsService.createTaskComment(workspaceId, projectId, taskId, userId, input);
  }
}
