import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateTaskSkillInput } from "./task-skills.contracts.js";
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

  async createTaskSkill(
    workspaceId: string,
    userId: string,
    input: CreateTaskSkillInput,
  ): Promise<TaskSkillDetailDto> {
    const result = await this.readStore.createForWorkspace(workspaceId, userId, input);

    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot create task skills in this workspace.");
    }

    if (result.status === "duplicate_name") {
      throw new BadRequestException("Task skill name already exists in this workspace.");
    }

    return new TaskSkillDetailDto(result.taskSkill);
  }
}
