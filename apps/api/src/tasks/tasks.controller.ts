import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  ApiTrustedCurrentUser,
  TrustedCurrentUserId,
} from "../auth/trusted-current-user.decorator.js";
import type {
  AddTaskSubtasksInput,
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTaskTableInput,
  MoveTaskInput,
  UpdateTaskAssigneeInput,
  UpdateTaskDueDateInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import {
  AddTaskSubtasksDto,
  BulkUpdateTasksDto,
  CreateTaskDto,
  MoveTaskDto,
  ParseAddTaskSubtasksBodyPipe,
  ParseBulkUpdateTasksBodyPipe,
  ParseCreateTaskBodyPipe,
  ParseListTaskTableQueryPipe,
  ParseMoveTaskBodyPipe,
  ParseUpdateTaskAssigneeBodyPipe,
  ParseUpdateTaskBodyPipe,
  ParseUpdateTaskDueDateBodyPipe,
  ParseUpdateTaskStatusBodyPipe,
  TaskDetailDto,
  TaskSummaryDto,
  TaskTablePageDto,
  UpdateTaskAssigneeDto,
  UpdateTaskDto,
  UpdateTaskDueDateDto,
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

  @Get("table")
  @ApiOperation({ summary: "List active project tasks for the scalable table" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "statusId", required: false, format: "uuid", type: String })
  @ApiQuery({
    name: "statusFilter",
    required: false,
    enum: ["unassigned"],
    description: "Filter tasks without a status. Cannot be combined with statusId.",
  })
  @ApiQuery({ name: "assigneeUserId", required: false, format: "uuid", type: String })
  @ApiQuery({
    name: "assigneeFilter",
    required: false,
    enum: ["unassigned"],
    description: "Filter tasks without an assignee. Cannot be combined with assigneeUserId.",
  })
  @ApiQuery({ name: "dueFrom", required: false, format: "date-time", type: String })
  @ApiQuery({ name: "dueTo", required: false, format: "date-time", type: String })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["title", "status", "assignee", "dueAt", "createdAt", "updatedAt"],
  })
  @ApiQuery({ name: "sortDirection", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "page", required: false, type: Number, minimum: 1 })
  @ApiQuery({ name: "pageSize", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiOkResponse({ type: TaskTablePageDto })
  @ApiBadRequestResponse({ description: "Task table query is invalid." })
  @ApiNotFoundResponse({ description: "Workspace or project is missing or not visible." })
  listTaskTable(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Query(new ParseListTaskTableQueryPipe()) input: ListTaskTableInput,
  ): Promise<TaskTablePageDto> {
    return this.tasksService.listTaskTable(workspaceId, projectId, userId, input);
  }

  @Patch("bulk")
  @ApiOperation({ summary: "Atomically update up to 100 active project tasks" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiBody({ type: BulkUpdateTasksDto })
  @ApiOkResponse({ isArray: true, type: TaskDetailDto })
  @ApiBadRequestResponse({
    description: "Bulk update payload or referenced task fields are invalid.",
  })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace, project, or one of the tasks is missing or not visible.",
  })
  bulkUpdateTasks(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseBulkUpdateTasksBodyPipe()) input: BulkUpdateTasksInput,
  ): Promise<TaskDetailDto[]> {
    return this.tasksService.bulkUpdateTasks(workspaceId, projectId, userId, input);
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

  @Post(":taskId/subtasks")
  @ApiOperation({ summary: "Create subtasks under one active task" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: AddTaskSubtasksDto })
  @ApiCreatedResponse({ isArray: true, type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task subtasks payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot create tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  addTaskSubtasks(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseAddTaskSubtasksBodyPipe()) input: AddTaskSubtasksInput,
  ): Promise<TaskDetailDto[]> {
    return this.tasksService.addTaskSubtasks(workspaceId, projectId, taskId, userId, input);
  }

  @Patch(":taskId")
  @ApiOperation({ summary: "Update one active task in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: UpdateTaskDto })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  updateTask(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskBodyPipe()) input: UpdateTaskInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.updateTask(workspaceId, projectId, taskId, userId, input);
  }

  @Patch(":taskId/move")
  @ApiOperation({ summary: "Move one active task within a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: MoveTaskDto })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task move payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  moveTask(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseMoveTaskBodyPipe()) input: MoveTaskInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.moveTask(workspaceId, projectId, taskId, userId, input);
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

  @Patch(":taskId/due-date")
  @ApiOperation({ summary: "Update one task due date in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiBody({ type: UpdateTaskDueDateDto })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiBadRequestResponse({ description: "Task due date payload is invalid." })
  @ApiForbiddenResponse({ description: "Current user cannot update tasks in this workspace." })
  @ApiNotFoundResponse({ description: "Workspace, project, or task is missing or not visible." })
  updateTaskDueDate(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
    @Body(new ParseUpdateTaskDueDateBodyPipe()) input: UpdateTaskDueDateInput,
  ): Promise<TaskDetailDto> {
    return this.tasksService.updateTaskDueDate(workspaceId, projectId, taskId, userId, input);
  }

  @Delete(":taskId")
  @ApiOperation({ summary: "Archive one active task in a visible project" })
  @ApiParam({ format: "uuid", name: "workspaceId" })
  @ApiParam({ format: "uuid", name: "projectId" })
  @ApiParam({ format: "uuid", name: "taskId" })
  @ApiOkResponse({ type: TaskDetailDto })
  @ApiForbiddenResponse({ description: "Current user cannot archive tasks in this workspace." })
  @ApiNotFoundResponse({
    description: "Workspace, project, or active task is missing or not visible.",
  })
  archiveTask(
    @Param("workspaceId", uuidV4Pipe) workspaceId: string,
    @Param("projectId", uuidV4Pipe) projectId: string,
    @Param("taskId", uuidV4Pipe) taskId: string,
    @TrustedCurrentUserId() userId: string,
  ): Promise<TaskDetailDto> {
    return this.tasksService.archiveTask(workspaceId, projectId, taskId, userId);
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
