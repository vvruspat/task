import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  CreateTaskInput,
  UpdateTaskAssigneeInput,
  UpdateTaskStatusInput,
} from "./tasks.contracts.js";
import { TaskDetailDto, TaskSummaryDto } from "./tasks.dto.js";
import type { TaskReadStore } from "./tasks.store.js";

@Injectable()
export class TasksService {
  constructor(private readonly readStore: TaskReadStore) {}

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

    return new TaskDetailDto(result.task);
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
}
