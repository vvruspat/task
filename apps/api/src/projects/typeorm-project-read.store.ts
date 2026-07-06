import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  ProjectEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import type { CreateProjectInput, ProjectDetail, ProjectSummary } from "./projects.contracts.js";
import type { ProjectCreateResult, ProjectReadStore } from "./projects.store.js";

const projectWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);

@Injectable()
export class TypeOrmProjectReadStore implements ProjectReadStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async listActiveForWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<ProjectSummary[] | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadWorkspace = await this.hasWorkspaceMembership(dataSource, workspaceId, userId);

    if (!canReadWorkspace) {
      return null;
    }

    const projects = await dataSource.getRepository(ProjectEntity).find({
      where: { archivedAt: IsNull(), workspaceId },
      order: { position: "ASC", createdAt: "ASC" },
    });

    return projects.map(toProjectSummary);
  }

  async getForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDetail | null> {
    const dataSource = await this.getInitializedDataSource();
    const canReadWorkspace = await this.hasWorkspaceMembership(dataSource, workspaceId, userId);

    if (!canReadWorkspace) {
      return null;
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return null;
    }

    return toProjectSummary(project);
  }

  async createForWorkspace(
    workspaceId: string,
    userId: string,
    input: CreateProjectInput,
  ): Promise<ProjectCreateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "workspace_not_found" };
    }

    if (!projectWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const savedProject = await dataSource.transaction(async (manager): Promise<ProjectEntity> => {
      const projectRepository = manager.getRepository(ProjectEntity);
      const project = projectRepository.create({
        workspaceId,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? null,
        position: input.position ?? null,
        createdByUserId: userId,
      });
      const createdProject = await projectRepository.save(project);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "project.created",
        entityType: "project",
        entityId: createdProject.id,
        payload: {
          title: createdProject.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return createdProject;
    });

    return { project: toProjectSummary(savedProject), status: "created" };
  }

  private async hasWorkspaceMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    return membership !== null;
  }

  private async getWorkspaceMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMemberEntity | null> {
    return dataSource.getRepository(WorkspaceMemberEntity).findOneBy({
      workspaceId,
      userId,
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();

    if (dataSource === null) {
      throw new ServiceUnavailableException("Database is not configured.");
    }

    if (dataSource.isInitialized) {
      return dataSource;
    }

    this.initialization ??= dataSource.initialize();

    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

function toProjectSummary(project: ProjectEntity): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    title: project.title,
    description: project.description,
    status: project.status,
    position: project.position,
    createdByUserId: project.createdByUserId,
    archivedAt: project.archivedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
