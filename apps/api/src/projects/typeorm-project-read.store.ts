import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { type DataSource, IsNull } from "typeorm";
import { selectAvailableWorkspaceScopedSlug } from "../common/workspace-slug.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ActivityEventEntity,
  AttachmentEntity,
  CommentEntity,
  ProjectEntity,
  SavedViewEntity,
  StatusEntity,
  TaskEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import { defaultProjectStatuses } from "./default-project-statuses.js";
import { buildDefaultProjectView } from "./default-project-view.js";
import { selectAvailableProjectKey } from "./project-key.js";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from "./projects.contracts.js";
import type {
  ProjectArchiveResult,
  ProjectCreateResult,
  ProjectDeleteResult,
  ProjectReadStore,
  ProjectUpdateResult,
} from "./projects.store.js";

const projectWriteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin", "member"]);
const projectDeleteRoles: ReadonlySet<WorkspaceMemberRole> = new Set(["owner", "admin"]);

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
      archivedAt: IsNull(),
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
      await manager.getRepository(WorkspaceEntity).findOne({
        where: { id: workspaceId },
        lock: { mode: "pessimistic_write" },
      });
      const existingProjects = await projectRepository.findBy({ workspaceId });
      const key = selectAvailableProjectKey(
        input.title,
        new Set(existingProjects.map((project) => project.key)),
      );
      const slug = selectAvailableWorkspaceScopedSlug(
        input.title,
        new Set(existingProjects.map((project) => project.slug)),
      );
      const project = projectRepository.create({
        workspaceId,
        key,
        slug,
        nextTaskNumber: 1,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? null,
        position: input.position ?? null,
        createdByUserId: userId,
      });
      const createdProject = await projectRepository.save(project);
      const savedViewRepository = manager.getRepository(SavedViewEntity);
      const existingViews = await savedViewRepository.findBy({ workspaceId });
      const defaultView = buildDefaultProjectView(createdProject.id, createdProject.title);
      await savedViewRepository.save(
        savedViewRepository.create({
          ...defaultView,
          workspaceId,
          userId,
          slug: selectAvailableWorkspaceScopedSlug(
            defaultView.name,
            new Set(existingViews.map((view) => view.slug)),
          ),
        }),
      );
      const statuses = defaultProjectStatuses.map((status) =>
        manager.getRepository(StatusEntity).create({
          ...status,
          projectId: createdProject.id,
          workspaceId,
        }),
      );
      await manager.getRepository(StatusEntity).save(statuses);
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

  async archiveForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectArchiveResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "project_not_found" };
    }

    if (!projectWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      archivedAt: IsNull(),
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "project_not_found" };
    }

    const archivedProject = await dataSource.transaction(
      async (manager): Promise<ProjectEntity> => {
        project.archivedAt = new Date();

        const savedProject = await manager.getRepository(ProjectEntity).save(project);
        const activityEvent = manager.getRepository(ActivityEventEntity).create({
          workspaceId,
          actorUserId: userId,
          eventType: "project.archived",
          entityType: "project",
          entityId: savedProject.id,
          payload: {
            title: savedProject.title,
          },
        });

        await manager.getRepository(ActivityEventEntity).save(activityEvent);

        return savedProject;
      },
    );

    return { project: toProjectSummary(archivedProject), status: "archived" };
  }

  async deleteForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<ProjectDeleteResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);
    if (membership === null) return { status: "project_not_found" };
    if (!projectDeleteRoles.has(membership.role)) return { status: "forbidden" };

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      id: projectId,
      workspaceId,
    });
    if (project === null) return { status: "project_not_found" };
    const deletedProject = toProjectSummary(project);

    await dataSource.transaction(async (manager): Promise<void> => {
      const tasks = await manager.getRepository(TaskEntity).find({
        select: { id: true },
        where: { projectId, workspaceId },
      });
      const taskIds = tasks.map((task) => task.id);
      const commentIds =
        taskIds.length === 0
          ? []
          : (
              await manager
                .getRepository(CommentEntity)
                .createQueryBuilder("comment")
                .select("comment.id", "id")
                .where("comment.workspace_id = :workspaceId", { workspaceId })
                .andWhere("comment.task_id IN (:...taskIds)", { taskIds })
                .getRawMany<{ id: string }>()
            ).map((comment) => comment.id);

      const attachmentTargets: Array<{
        targetType: "comment" | "project" | "task";
        ids: string[];
      }> = [
        { targetType: "project", ids: [projectId] },
        { targetType: "task", ids: taskIds },
        { targetType: "comment", ids: commentIds },
      ];
      for (const target of attachmentTargets) {
        if (target.ids.length === 0) continue;
        await manager
          .getRepository(AttachmentEntity)
          .createQueryBuilder()
          .delete()
          .where("workspace_id = :workspaceId", { workspaceId })
          .andWhere("target_type = :targetType", { targetType: target.targetType })
          .andWhere("target_id IN (:...ids)", { ids: target.ids })
          .execute();
      }

      const activityTargets: Array<{ entityType: string; ids: string[] }> = [
        { entityType: "project", ids: [projectId] },
        { entityType: "task", ids: taskIds },
        { entityType: "comment", ids: commentIds },
      ];
      for (const target of activityTargets) {
        if (target.ids.length === 0) continue;
        await manager
          .getRepository(ActivityEventEntity)
          .createQueryBuilder()
          .delete()
          .where("workspace_id = :workspaceId", { workspaceId })
          .andWhere("entity_type = :entityType", { entityType: target.entityType })
          .andWhere("entity_id IN (:...ids)", { ids: target.ids })
          .execute();
      }

      const savedViews = await manager.getRepository(SavedViewEntity).findBy({ workspaceId });
      const relatedViews = savedViews.filter(
        (view) =>
          view.projectId === projectId ||
          (Array.isArray(view.settings.filters) &&
            view.settings.filters.some(
              (filter) => filter.field === "project" && filter.value === projectId,
            )),
      );
      if (relatedViews.length > 0) {
        await manager.getRepository(SavedViewEntity).remove(relatedViews);
      }
      await manager.getRepository(ProjectEntity).remove(project);
    });

    return { project: deletedProject, status: "deleted" };
  }

  async updateForWorkspace(
    workspaceId: string,
    projectId: string,
    userId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectUpdateResult> {
    const dataSource = await this.getInitializedDataSource();
    const membership = await this.getWorkspaceMembership(dataSource, workspaceId, userId);

    if (membership === null) {
      return { status: "project_not_found" };
    }

    if (!projectWriteRoles.has(membership.role)) {
      return { status: "forbidden" };
    }

    const project = await dataSource.getRepository(ProjectEntity).findOneBy({
      archivedAt: IsNull(),
      id: projectId,
      workspaceId,
    });

    if (project === null) {
      return { status: "project_not_found" };
    }

    const updatedFields = getUpdatedProjectFields(input);
    const updatedProject = await dataSource.transaction(async (manager): Promise<ProjectEntity> => {
      if (input.title !== undefined) {
        project.title = input.title;
      }

      if (input.description !== undefined) {
        project.description = input.description;
      }

      if (input.status !== undefined) {
        project.status = input.status;
      }

      if (input.position !== undefined) {
        project.position = input.position;
      }

      const savedProject = await manager.getRepository(ProjectEntity).save(project);
      const activityEvent = manager.getRepository(ActivityEventEntity).create({
        workspaceId,
        actorUserId: userId,
        eventType: "project.updated",
        entityType: "project",
        entityId: savedProject.id,
        payload: {
          fields: updatedFields,
          title: savedProject.title,
        },
      });

      await manager.getRepository(ActivityEventEntity).save(activityEvent);

      return savedProject;
    });

    return { project: toProjectSummary(updatedProject), status: "updated" };
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

function getUpdatedProjectFields(input: UpdateProjectInput): string[] {
  const fields: string[] = [];

  if (input.title !== undefined) {
    fields.push("title");
  }

  if (input.description !== undefined) {
    fields.push("description");
  }

  if (input.status !== undefined) {
    fields.push("status");
  }

  if (input.position !== undefined) {
    fields.push("position");
  }

  return fields;
}

function toProjectSummary(project: ProjectEntity): ProjectSummary {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    key: project.key,
    slug: project.slug,
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
