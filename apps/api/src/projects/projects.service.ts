import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProjectInput } from "./projects.contracts.js";
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

  async createProject(
    workspaceId: string,
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectDetailDto> {
    const result = await this.readStore.createForWorkspace(workspaceId, userId, input);

    if (result.status === "workspace_not_found") {
      throw new NotFoundException("Workspace was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot create projects in this workspace.");
    }

    return new ProjectDetailDto(result.project);
  }
}
