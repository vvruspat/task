import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectDetailDto, ProjectSummaryDto } from "./projects.dto.js";
import type { ProjectReadStore } from "./projects.store.js";

@Injectable()
export class ProjectsService {
  constructor(private readonly readStore: ProjectReadStore) {}

  async listActiveProjects(workspaceId: string, userId: string): Promise<ProjectSummaryDto[]> {
    const projects = await this.readStore.listActiveForWorkspace(workspaceId, userId);

    if (projects === null) {
      throw new NotFoundException("Workspace was not found.");
    }

    return projects.map((project) => new ProjectSummaryDto(project));
  }

  async getProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetailDto> {
    const project = await this.readStore.getForWorkspace(workspaceId, projectId, userId);

    if (project === null) {
      throw new NotFoundException("Project was not found.");
    }

    return new ProjectDetailDto(project);
  }
}
