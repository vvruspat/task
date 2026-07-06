import { Injectable, NotFoundException } from "@nestjs/common";
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
}
