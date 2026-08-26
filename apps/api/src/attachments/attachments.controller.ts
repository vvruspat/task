import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiServiceUnavailableResponse,
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
  ParseTaskFileUploadBodyPipe,
  parseTaskFileUploadHeaders,
  TaskAttachmentDto,
} from "./attachments.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { AttachmentsService } from "./attachments.service.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TaskFileUploadService } from "./task-file-upload.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("attachments")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks/:taskId/attachments")
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly taskFileUploads: TaskFileUploadService,
  ) {}

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

  @Post("uploads")
  @ApiOperation({ summary: "Upload a binary file to a visible task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiHeader({
    description: "URL-encoded UTF-8 file name.",
    name: "x-task-file-name",
    required: true,
  })
  @ApiHeader({ name: "x-task-file-mime-type", required: true })
  @ApiConsumes("application/octet-stream")
  @ApiBody({ schema: { format: "binary", type: "string" } })
  @ApiCreatedResponse({ type: TaskAttachmentDto })
  @ApiBadRequestResponse({ description: "File name, MIME type, or body is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot attach files in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  @ApiServiceUnavailableResponse({ description: "Attachment storage is not configured." })
  uploadTaskFile(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Headers() headers: unknown,
    @Body(new ParseTaskFileUploadBodyPipe()) bytes: Uint8Array,
  ): Promise<TaskAttachmentDto> {
    const metadata = parseTaskFileUploadHeaders(headers);
    return this.taskFileUploads.upload(workspaceId, projectId, taskId, userId, {
      bytes,
      ...metadata,
    });
  }

  @Get(":attachmentId/content")
  @ApiOperation({ summary: "Download one uploaded task file" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiParam({ format: "uuid", name: "attachmentId" })
  @ApiProduces("application/octet-stream")
  @ApiOkResponse({ schema: { format: "binary", type: "string" } })
  @ApiNotFoundResponse({ description: "Task or file is missing or not visible." })
  @ApiServiceUnavailableResponse({ description: "File content is unavailable." })
  async downloadTaskFile(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @Param("attachmentId", uuidV4Pipe) attachmentId: string,
    @TrustedCurrentUserId() userId: string,
    @Res({ passthrough: true }) response: TaskFileDownloadResponse,
  ): Promise<StreamableFile> {
    const content = await this.taskFileUploads.read(
      workspaceId,
      projectId,
      taskId,
      attachmentId,
      userId,
    );
    response.header("cache-control", "private, no-store");
    response.header(
      "content-disposition",
      `attachment; filename*=UTF-8''${encodeRfc5987Value(content.fileName)}`,
    );
    response.header("content-length", String(content.sizeBytes));
    response.header("content-type", content.mimeType);
    response.header("x-content-type-options", "nosniff");
    return new StreamableFile(Buffer.from(content.bytes));
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

type TaskFileDownloadResponse = {
  header(name: string, value: string): unknown;
};

function encodeRfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (character) => `%${character.codePointAt(0)?.toString(16).toUpperCase() ?? ""}`,
  );
}
