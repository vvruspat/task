import { Injectable, NotFoundException } from "@nestjs/common";
import { TaskSkillDetailDto, TaskSkillSummaryDto } from "./task-skills.dto.js";
import type { TaskSkillsReadStore } from "./task-skills.store.js";

@Injectable()
export class TaskSkillsService {
  constructor(private readonly readStore: TaskSkillsReadStore) {}

  async listActiveTaskSkills(workspaceId: string, userId: string): Promise<TaskSkillSummaryDto[]> {
    const skills = await this.readStore.listActiveForWorkspace(workspaceId, userId);

    if (skills === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return skills.map((skill) => new TaskSkillSummaryDto(skill));
  }

  async getTaskSkill(
    workspaceId: string,
    taskSkillId: string,
    userId: string,
  ): Promise<TaskSkillDetailDto> {
    const skill = await this.readStore.getActiveForWorkspace(workspaceId, taskSkillId, userId);

    if (skill === null) {
      throw new NotFoundException("Task skill was not found.");
    }

    return new TaskSkillDetailDto(skill);
  }
}
