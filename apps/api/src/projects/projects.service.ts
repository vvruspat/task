import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.contracts.js";
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

  async archiveProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetailDto> {
    const result = await this.readStore.archiveForWorkspace(workspaceId, projectId, userId);

    if (result.status === "project_not_found") {
      throw new NotFoundException("Project was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot archive projects in this workspace.");
    }

    return new ProjectDetailDto(result.project);
  }

  async deleteProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetailDto> {
    const result = await this.readStore.deleteForWorkspace(workspaceId, projectId, userId);
    if (result.status === "project_not_found")
      throw new NotFoundException("Project was not found.");
    if (result.status === "forbidden") {
      throw new ForbiddenException("Only workspace owners and admins can delete projects.");
    }
    if (!("project" in result)) throw new NotFoundException("Project was not found.");
    return new ProjectDetailDto(result.project);
  }

  async updateProject(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectDetailDto> {
    const result = await this.readStore.updateForWorkspace(workspaceId, projectId, userId, input);

    if (result.status === "project_not_found") {
      throw new NotFoundException("Project was not found.");
    }

    if (result.status === "forbidden") {
      throw new ForbiddenException("Current user cannot update projects in this workspace.");
    }

    return new ProjectDetailDto(result.project);
  }
}
