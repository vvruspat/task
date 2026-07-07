import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
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
  CreateTaskInput,
  UpdateTaskAssigneeInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import {
  CreateTaskDto,
  ParseCreateTaskBodyPipe,
  ParseUpdateTaskAssigneeBodyPipe,
  ParseUpdateTaskStatusBodyPipe,
  TaskDetailDto,
  TaskSummaryDto,
  UpdateTaskAssigneeDto,
  UpdateTaskStatusDto,
} from "./tasks.dto.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the service value at runtime.
import { TasksService } from "./tasks.service.js";

const uuidV4Pipe = new ParseUUIDPipe({ version: "4" });

@ApiTags("tasks")
@ApiTrustedCurrentUser()
@Controller("workspaces/:workspaceId/projects/:projectId/tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "List active tasks in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiOkResponse({ isArray: true, type: TaskSummaryDto })
  @ApiNotFoundResponse({ description: "Workspace or project is missing or not visible." })
  listActiveTasks(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskSummaryDto[]> {
    return this.tasksService.listActiveTasks(workspaceId, projectId, userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a task in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiBody({ type: CreateTaskDto })
  @ApiCreatedResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot create tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace or project is missing or not visible." })
  createTask(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseCreateTaskBodyPipe()) input: CreateTaskInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.createTask(workspaceId, projectId, userId, input);
  }

  @Patch(":taskId/status")
  @ApiOperation({ summary: "Update one task status in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: UpdateTaskStatusDto })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task status payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  updateTaskStatus(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskStatusBodyPipe()) input: UpdateTaskStatusInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.updateTaskStatus(workspaceId, projectId, taskId, userId, input);
  }

  @Patch(":taskId/assignee")
  @ApiOperation({ summary: "Update one task assignee in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: UpdateTaskAssigneeDto })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task assignee payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  updateTaskAssignee(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskAssigneeBodyPipe()) input: UpdateTaskAssigneeInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.updateTaskAssignee(workspaceId, projectId, taskId, userId, input);
  }

  @Get(":taskId")
  @ApiOperation({ summary: "Get one task in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiNotFoundResponse({
    description: "Workspace, project, or task is missing or not visible.",
  })
  getTask(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskDetailDto> {
    return this.tasksService.getTask(workspaceId, projectId, taskId, userId);
  }
}
