import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { DataSource } from "typeorm";
import { selectAvailableWorkspaceScopedSlug } from "../common/workspace-slug.js";
// biome-ignore lint/style/useImportType: Nest constructor injection needs the provider value at runtime.
import { ApiDataSourceProvider } from "../database/database.module.js";
import {
  ProjectEntity,
  SavedViewEntity,
  WorkspaceEntity,
  WorkspaceMemberEntity,
} from "../persistence/entities/index.js";
import type {
  CreateSavedViewInput,
  SavedView,
  SavedViewFilter,
  UpdateSavedViewInput,
} from "./views.contracts.js";
import type { SavedViewsStore, SavedViewWriteResult } from "./views.store.js";

const myIssuesSystemKey = "my-issues";

@Injectable()
export class TypeOrmViewsStore implements SavedViewsStore {
  private initialization: Promise<DataSource> | null = null;

  constructor(private readonly dataSourceProvider: ApiDataSourceProvider) {}

  async list(workspaceId: string, userId: string): Promise<SavedView[] | null> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId))) return null;
    await this.ensureMyIssuesView(dataSource, workspaceId, userId);
    const workspaceViews = await dataSource.getRepository(SavedViewEntity).find({
      where: { workspaceId },
      order: { updatedAt: "DESC", createdAt: "ASC" },
    });
    const views = workspaceViews.filter((view) => isSavedViewVisibleToUser(view, userId));
    views.sort((left, right) => {
      if (left.systemKey === myIssuesSystemKey) return -1;
      if (right.systemKey === myIssuesSystemKey) return 1;
      return 0;
    });
    return views.map(toSavedView);
  }

  async create(
    workspaceId: string,
    userId: string,
    input: CreateSavedViewInput,
  ): Promise<SavedViewWriteResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId)))
      return { status: "workspace_not_found" };
    if (!(await this.projectExists(dataSource, workspaceId, input.projectId ?? null)))
      return { status: "project_not_found" };
    const view = await dataSource.transaction(async (manager): Promise<SavedViewEntity> => {
      await manager.getRepository(WorkspaceEntity).findOne({
        where: { id: workspaceId },
        lock: { mode: "pessimistic_write" },
      });
      const repository = manager.getRepository(SavedViewEntity);
      const existingViews = await repository.findBy({ workspaceId });
      const slug = selectAvailableWorkspaceScopedSlug(
        input.name,
        new Set(existingViews.map((existingView) => existingView.slug)),
      );
      return repository.save(
        repository.create({
          workspaceId,
          userId,
          slug,
          projectId: input.projectId ?? null,
          name: input.name,
          description: input.description ?? null,
          visibility: input.visibility,
          layout: input.layout,
          settings: input.settings,
        }),
      );
    });
    return { status: "ok", view: toSavedView(view) };
  }

  async update(
    workspaceId: string,
    viewId: string,
    userId: string,
    input: UpdateSavedViewInput,
  ): Promise<SavedViewWriteResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId)))
      return { status: "workspace_not_found" };
    if (
      input.projectId !== undefined &&
      !(await this.projectExists(dataSource, workspaceId, input.projectId))
    )
      return { status: "project_not_found" };
    const repository = dataSource.getRepository(SavedViewEntity);
    const view = await repository.findOneBy({
      id: viewId,
      workspaceId,
      userId,
    });
    if (view === null) return { status: "view_not_found" };
    if (input.name !== undefined) view.name = input.name;
    if (input.description !== undefined) view.description = input.description;
    if (input.projectId !== undefined) view.projectId = input.projectId;
    if (input.visibility !== undefined && view.systemKey === null) {
      view.visibility = input.visibility;
    }
    if (input.layout !== undefined) view.layout = input.layout;
    if (input.settings !== undefined) view.settings = input.settings;
    return { status: "ok", view: toSavedView(await repository.save(view)) };
  }

  async delete(workspaceId: string, viewId: string, userId: string): Promise<SavedViewWriteResult> {
    const dataSource = await this.getInitializedDataSource();
    if (!(await this.hasMembership(dataSource, workspaceId, userId)))
      return { status: "workspace_not_found" };
    const repository = dataSource.getRepository(SavedViewEntity);
    const view = await repository.findOneBy({
      id: viewId,
      workspaceId,
      userId,
    });
    if (view === null) return { status: "view_not_found" };
    await repository.remove(view);
    return { status: "ok", view: toSavedView(view) };
  }

  private async hasMembership(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return (
      (await dataSource.getRepository(WorkspaceMemberEntity).findOneBy({ workspaceId, userId })) !==
      null
    );
  }

  private async projectExists(
    dataSource: DataSource,
    workspaceId: string,
    projectId: string | null,
  ): Promise<boolean> {
    if (projectId === null) return true;
    return (
      (await dataSource.getRepository(ProjectEntity).findOneBy({ id: projectId, workspaceId })) !==
      null
    );
  }

  private async ensureMyIssuesView(
    dataSource: DataSource,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const existing = await dataSource.getRepository(SavedViewEntity).findOneBy({
      workspaceId,
      userId,
      systemKey: myIssuesSystemKey,
    });
    if (existing !== null) return;
    await dataSource.transaction(async (manager): Promise<void> => {
      await manager.getRepository(WorkspaceEntity).findOne({
        where: { id: workspaceId },
        lock: { mode: "pessimistic_write" },
      });
      const repository = manager.getRepository(SavedViewEntity);
      const lockedExisting = await repository.findOneBy({
        workspaceId,
        userId,
        systemKey: myIssuesSystemKey,
      });
      if (lockedExisting !== null) return;
      const workspaceViews = await repository.findBy({ workspaceId });
      await repository.save(
        repository.create({
          workspaceId,
          userId,
          systemKey: myIssuesSystemKey,
          slug: selectAvailableWorkspaceScopedSlug(
            "My issues",
            new Set(workspaceViews.map((view) => view.slug)),
          ),
          projectId: null,
          name: "My issues",
          description: "Issues assigned to you",
          visibility: "private",
          layout: "list",
          settings: {
            grouping: "status",
            subGrouping: "none",
            ordering: "manual",
            orderDirection: "asc",
            showSubtasks: true,
            showEmptyGroups: false,
            displayProperties: ["status", "project", "due_at"],
            filters: [{ field: "assignee", operator: "is", value: userId }],
          },
        }),
      );
    });
  }

  private async getInitializedDataSource(): Promise<DataSource> {
    const dataSource = this.dataSourceProvider.getDataSource();
    if (dataSource === null) throw new ServiceUnavailableException("Database is not configured.");
    if (dataSource.isInitialized) return dataSource;
    this.initialization ??= dataSource.initialize();
    try {
      return await this.initialization;
    } catch (error) {
      this.initialization = null;
      throw error;
    }
  }
}

export function isSavedViewVisibleToUser(
  view: Pick<SavedViewEntity, "userId" | "visibility">,
  userId: string,
): boolean {
  return view.userId === userId || view.visibility === "workspace";
}

function toSavedView(view: SavedViewEntity): SavedView {
  const storedFilters = view.settings.filters ?? [];
  const projectFilter: SavedViewFilter | null =
    view.projectId === null ? null : { field: "project", operator: "is", value: view.projectId };
  const filters =
    projectFilter !== null &&
    !storedFilters.some(
      (filter) =>
        filter.field === projectFilter.field &&
        filter.operator === projectFilter.operator &&
        filter.value === projectFilter.value,
    )
      ? [...storedFilters, projectFilter]
      : storedFilters;
  return {
    id: view.id,
    workspaceId: view.workspaceId,
    userId: view.userId,
    slug: view.slug,
    projectId: null,
    name: view.name,
    description: view.description,
    visibility: view.visibility,
    system: view.systemKey !== null,
    layout: view.layout,
    settings: { ...view.settings, filters },
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
}
