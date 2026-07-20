import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ParsedIssueIdentifier } from "./issue-identifier.js";
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
import { TaskDetailDto, TaskSummaryDto, TaskTablePageDto } from "./tasks.dto.js";
import type { TaskReadStore } from "./tasks.store.js";

@Injectable()
export class TasksService {
  constructor(private readonly readStore: TaskReadStore) {}

  async getTaskById(workspaceId: string, taskId: string, userId: string): Promise<TaskDetailDto> {
    const task = await this.readStore.getByIdForWorkspace?.(workspaceId, taskId, userId);
    if (task === null || task === undefined) throw new NotFoundException("Issue was not found.");
    return new TaskDetailDto(task);
  }

  async getTaskByIdentifier(
    workspaceId: string,
    identifier: ParsedIssueIdentifier,
    userId: string,
  ): Promise<TaskDetailDto> {
    const task = await this.readStore.getByIdentifierForWorkspace(workspaceId, identifier, userId);
    if (task === null) throw new NotFoundException("Issue was not found.");
    return new TaskDetailDto(task);
  }

  async listActiveTasks(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<TaskSummaryDto[]> {
    const tasks = await this.readStore.listActiveForProject(workspaceId, projectId, userId);

    if (tasks === null) {
      throw new NotFoundException("Project was not found.");
    }

    return tasks.map((task) => new TaskSummaryDto(task));
  }

  async getTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetailDto> {
    const task = await this.readStore.getForProject(workspaceId, projectId, taskId, userId);

    if (task === null) {
      throw new NotFoundException("Task was not found.");
    }

    return new TaskDetailDto(task);
  }

  async listTaskTable(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: ListTaskTableInput,
  ): Promise<TaskTablePageDto> {
    const page = await this.readStore.listTableForProject(workspaceId, projectId, userId, input);

    if (page === null) throw new NotFoundException("Project was not found.");

    return new TaskTablePageDto(page);
  }

  async bulkUpdateTasks(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: BulkUpdateTasksInput,
  ): Promise<TaskDetailDto[]> {
    const result = await this.readStore.bulkUpdateForProject(workspaceId, projectId, userId, input);

    if (result.status === "project_not_found" || result.status === "invalid_task")
      throw new NotFoundException("One or more tasks were not found.");
    if (result.status === "forbidden")
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    if (result.status === "invalid_status")
      throw new BadRequestException("Task status must belong to the same workspace.");
    if (result.status === "invalid_assignee")
      throw new BadRequestException("Task assignee must belong to the same workspace.");

    return result.tasks.map((task) => new TaskDetailDto(task));
  }

  async createTask(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: CreateTaskInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.createForProject(workspaceId, projectId, userId, input);

    if (result.status === "project_not_found") {
      throw new NotFoundException("Project was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot create tasks in this workspace.");
    }

    if (result.status === "invalid_parent_task") {
      throw new BadRequestException("Parent task must belong to the same project.");
    }

    if (result.status === "invalid_assignee") {
      throw new BadRequestException("Task assignee must belong to the same workspace.");
    }

    if (result.status === "invalid_status") {
      throw new BadRequestException("Task status must belong to the same project.");
    }

    return new TaskDetailDto(result.task);
  }

  async addTaskSubtasks(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: AddTaskSubtasksInput,
  ): Promise<TaskDetailDto[]> {
    const result = await this.readStore.addSubtasksForProject(
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
      throw new ForbiddenException("Current user cannot create tasks in this workspace.");
    }

    return result.tasks.map((task) => new TaskDetailDto(task));
  }

  async updateTaskStatus(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskStatusInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.updateStatusForProject(
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
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    }

    if (result.status === "invalid_status") {
      throw new BadRequestException("Task status must belong to the same workspace.");
    }

    return new TaskDetailDto(result.task);
  }

  async updateTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.updateForProject(
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
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    }

    return new TaskDetailDto(result.task);
  }

  async moveTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: MoveTaskInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.moveForProject(
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
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    }

    if (result.status === "invalid_parent_task") {
      throw new BadRequestException("Parent task must be an active task in the same project.");
    }

    return new TaskDetailDto(result.task);
  }

  async updateTaskAssignee(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskAssigneeInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.updateAssigneeForProject(
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
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    }

    if (result.status === "invalid_assignee") {
      throw new BadRequestException("Task assignee must belong to the same workspace.");
    }

    return new TaskDetailDto(result.task);
  }

  async updateTaskDueDate(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
    input: UpdateTaskDueDateInput,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.updateDueDateForProject(
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
      throw new ForbiddenException("Current user cannot update tasks in this workspace.");
    }

    return new TaskDetailDto(result.task);
  }

  async archiveTask(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskDetailDto> {
    const result = await this.readStore.archiveForProject(workspaceId, projectId, taskId, userId);

    if (result.status === "task_not_found") {
      throw new NotFoundException("Task was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot archive tasks in this workspace.");
    }

    return new TaskDetailDto(result.task);
  }
}
