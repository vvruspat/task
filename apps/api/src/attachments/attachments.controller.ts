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
import type {
  CreateTaskFileAttachmentInput,
  CreateTaskLinkAttachmentInput,
  CreateTaskTelegramFileAttachmentInput,
} from "./attachments.contracts.js";
import {
  CreateTaskFileAttachmentDto,
  CreateTaskLinkAttachmentDto,
  CreateTaskTelegramFileAttachmentDto,
  ParseCreateTaskFileAttachmentBodyPipe,
  ParseCreateTaskLinkAttachmentBodyPipe,
  ParseCreateTaskTelegramFileAttachmentBodyPipe,
  TaskAttachmentDto,
} from "./attachments.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AttachmentsService } from "./attachments.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("attachments")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks/:taskId/attachments")
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: "List attachments for a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiOkResponse({ isArray: true, type: TaskAttachmentDto })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  listTaskAttachments(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskAttachmentDto[]> {
    return this.attachmentsService.listTaskAttachments(workspaceId, projectId, taskId, userId);
  }

  @Post("links")
  @ApiOperation({ summary: "Attach a link to a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: CreateTaskLinkAttachmentDto })
  @ApiCreatedResponse({ type: TaskAttachmentDto })
  @ApiBadRequestResponse({ description: "Attachment payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot attach links in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  createTaskLinkAttachment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskLinkAttachmentBodyPipe()) input: CreateTaskLinkAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    return this.attachmentsService.createTaskLinkAttachment(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );
  }

  @Post("files")
  @ApiOperation({ summary: "Attach file metadata to a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: CreateTaskFileAttachmentDto })
  @ApiCreatedResponse({ type: TaskAttachmentDto })
  @ApiBadRequestResponse({ description: "Attachment payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot attach files in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  createTaskFileAttachment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskFileAttachmentBodyPipe()) input: CreateTaskFileAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    return this.attachmentsService.createTaskFileAttachment(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );
  }

  @Post("telegram-files")
  @ApiOperation({ summary: "Attach Telegram file metadata to a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: CreateTaskTelegramFileAttachmentDto })
  @ApiCreatedResponse({ type: TaskAttachmentDto })
  @ApiBadRequestResponse({ description: "Attachment payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot attach Telegram files in this workspace.",
  })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  createTaskTelegramFileAttachment(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskTelegramFileAttachmentBodyPipe())
    input: CreateTaskTelegramFileAttachmentInput,
  ): Promise<TaskAttachmentDto> {
    return this.attachmentsService.createTaskTelegramFileAttachment(
      workspaceId,
      projectId,
      taskId,
      userId,
      input,
    );
  }
}
