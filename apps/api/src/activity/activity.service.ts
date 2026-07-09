import { Injectable, NotFoundException } from "@nestjs/common";
import { TaskActivityEventDto } from "./activity.dto.js";
import type { TaskActivityStore } from "./activity.store.js";

@Injectable()
export class ActivityService {
  constructor(private readonly activityStore: TaskActivityStore) {}

  async listTaskActivity(
    workspaceId: string,
    projectId: string,
    taskId: string,
    userId: string,
  ): Promise<TaskActivityEventDto[]> {
    const events = await this.activityStore.listForTask(workspaceId, projectId, taskId, userId);

    if (events === null) {
      throw new NotFoundException("Task was not found.");
    }

    return events.map((event) => new TaskActivityEventDto(event));
  }
}
