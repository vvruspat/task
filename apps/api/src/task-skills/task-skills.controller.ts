import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
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
  CloneTaskSkillInput,
  CreateTaskSkillInput,
  PreviewTaskSkillApplyInput,
  UpdateTaskSkillDefinitionInput,
  UpdateTaskSkillMetadataInput,
} from "./task-skills.contracts.js";
import {
  CloneTaskSkillDto,
  CreateTaskSkillDto,
  ParseCloneTaskSkillBodyPipe,
  ParseCreateTaskSkillBodyPipe,
  ParsePreviewTaskSkillApplyBodyPipe,
  ParseUpdateTaskSkillDefinitionBodyPipe,
  ParseUpdateTaskSkillMetadataBodyPipe,
  PreviewTaskSkillApplyDto,
  TaskSkillApplyPreviewDto,
  TaskSkillApplyResultDto,
  TaskSkillDetailDto,
  TaskSkillSummaryDto,
  UpdateTaskSkillDefinitionDto,
  UpdateTaskSkillMetadataDto,
} from "./task-skills.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TaskSkillsService } from "./task-skills.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("task-skills")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/task-skills")
export class TaskSkillsController {
  constructor(private readonly taskSkillsService: TaskSkillsService) {}

  @Get()
  @ApiOperation({ summary: "List active task skills for one visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiOkResponse({ isArray: true, type: TaskSkillSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  listActiveTaskSkills(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSkillSummaryDto[]> {
    return this.taskSkillsService.listActiveTaskSkills(workspaceId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a task skill in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiBody({ type: CreateTaskSkillDto })
  @ApiCreatedResponse({ type: TaskSkillDetailDto })
  @ApiBadRequestResponse({ description: "Task skill payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot create task skills in this workspace.",
  })
  @ApiNotFoundResponse({ description: "Workspace is missing or not visible to the current user." })
  createTaskSkill(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskSkillBodyPipe()) input: CreateTaskSkillInput,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.createTaskSkill(workspaceId, userId, input);
  }

  @Post(":taskSkillId/clone")
  @ApiOperation({ summary: "Clone one active task skill" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiBody({ type: CloneTaskSkillDto })
  @ApiCreatedResponse({ type: TaskSkillDetailDto })
  @ApiBadRequestResponse({ description: "Task skill clone payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot clone task skills in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or active task skill is missing or not visible to the current user.",
  })
  cloneTaskSkill(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCloneTaskSkillBodyPipe()) input: CloneTaskSkillInput,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.cloneTaskSkill(workspaceId, taskSkillId, userId, input);
  }

  @Get(":taskSkillId")
  @ApiOperation({ summary: "Get one active task skill with versions" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiOkResponse({ type: TaskSkillDetailDto })
  @ApiNotFoundResponse({
    description: "Workspace or task skill is missing or not visible to the current user.",
  })
  getTaskSkill(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.getTaskSkill(workspaceId, taskSkillId, userId);
  }

  @Delete(":taskSkillId")
  @ApiOperation({ summary: "Archive one active task skill" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiOkResponse({ type: TaskSkillDetailDto })
  @ApiForbiddenResponse({
    description: "Current user cannot archive task skills in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or active task skill is missing or not visible to the current user.",
  })
  archiveTaskSkill(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.archiveTaskSkill(workspaceId, taskSkillId, userId);
  }

  @Post(":taskSkillId/preview-apply")
  @ApiOperation({ summary: "Preview applying one task skill without creating tasks" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiBody({ type: PreviewTaskSkillApplyDto })
  @ApiOkResponse({ type: TaskSkillApplyPreviewDto })
  @ApiBadRequestResponse({ description: "Task skill apply preview payload is invalid." })
  @ApiNotFoundResponse({
    description: "Workspace, project, or task skill is missing or not visible to the current user.",
  })
  previewTaskSkillApply(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParsePreviewTaskSkillApplyBodyPipe()) input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyPreviewDto> {
    return this.taskSkillsService.previewTaskSkillApply(workspaceId, taskSkillId, userId, input);
  }

  @Post(":taskSkillId/apply")
  @ApiOperation({ summary: "Apply one task skill and create a task tree" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiBody({ type: PreviewTaskSkillApplyDto })
  @ApiCreatedResponse({ type: TaskSkillApplyResultDto })
  @ApiBadRequestResponse({ description: "Task skill apply payload or definition is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot apply task skills in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace, project, or task skill is missing or not visible to the current user.",
  })
  applyTaskSkill(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParsePreviewTaskSkillApplyBodyPipe()) input: PreviewTaskSkillApplyInput,
  ): Promise<TaskSkillApplyResultDto> {
    return this.taskSkillsService.applyTaskSkill(workspaceId, taskSkillId, userId, input);
  }

  @Patch(":taskSkillId/definition")
  @ApiOperation({ summary: "Create a new task skill definition version" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiBody({ type: UpdateTaskSkillDefinitionDto })
  @ApiOkResponse({ type: TaskSkillDetailDto })
  @ApiBadRequestResponse({ description: "Task skill definition payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot update task skills in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or task skill is missing or not visible to the current user.",
  })
  updateTaskSkillDefinition(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskSkillDefinitionBodyPipe()) input: UpdateTaskSkillDefinitionInput,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.updateTaskSkillDefinition(
      workspaceId,
      taskSkillId,
      userId,
      input,
    );
  }

  @Patch(":taskSkillId")
  @ApiOperation({ summary: "Update task skill metadata in a visible workspace" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "taskSkillId" })
  @ApiBody({ type: UpdateTaskSkillMetadataDto })
  @ApiOkResponse({ type: TaskSkillDetailDto })
  @ApiBadRequestResponse({ description: "Task skill metadata payload is invalid." })
  @ApiForbiddenResponse({
    description: "Current user cannot update task skills in this workspace.",
  })
  @ApiNotFoundResponse({
    description: "Workspace or task skill is missing or not visible to the current user.",
  })
  updateTaskSkillMetadata(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("taskSkillId", uuidV4Pipe) taskSkillId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskSkillMetadataBodyPipe()) input: UpdateTaskSkillMetadataInput,
  ): Promise<TaskSkillDetailDto> {
    return this.taskSkillsService.updateTaskSkillMetadata(workspaceId, taskSkillId, userId, input);
  }
}
