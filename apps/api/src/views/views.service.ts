import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateSavedViewInput, UpdateSavedViewInput } from "./views.contracts.js";
import { SavedViewDto } from "./views.dto.js";
import type { SavedViewsStore, SavedViewWriteResult } from "./views.store.js";

@Injectable()
export class ViewsService {
  constructor(private readonly store: SavedViewsStore) {}

  async list(workspaceId: string, userId: string): Promise<SavedViewDto[]> {
    const views = await this.store.list(workspaceId, userId);
    if (views === null) throw new NotFoundException("Workspace was not found.");
    return views.map((view) => new SavedViewDto(view));
  }

  async create(
    workspaceId: string,
    userId: string,
    input: CreateSavedViewInput,
  ): Promise<SavedViewDto> {
    return this.toDto(await this.store.create(workspaceId, userId, input));
  }

  async update(
    workspaceId: string,
    viewId: string,
    userId: string,
    input: UpdateSavedViewInput,
  ): Promise<SavedViewDto> {
    return this.toDto(await this.store.update(workspaceId, viewId, userId, input));
  }

  async delete(workspaceId: string, viewId: string, userId: string): Promise<SavedViewDto> {
    return this.toDto(await this.store.delete(workspaceId, viewId, userId));
  }

  private toDto(result: SavedViewWriteResult): SavedViewDto {
    if (result.status === "ok") return new SavedViewDto(result.view);
    if (result.status === "project_not_found")
      throw new NotFoundException("Project was not found.");
    if (result.status === "view_not_found") throw new NotFoundException("View was not found.");
    throw new NotFoundException("Workspace was not found.");
  }
}
