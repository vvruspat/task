import type { CreateSavedViewInput, SavedView, UpdateSavedViewInput } from "./views.contracts.js";

export type SavedViewWriteResult =
  | { status: "ok"; view: SavedView }
  | { status: "workspace_not_found" | "project_not_found" | "view_not_found" };

export type SavedViewsStore = {
  list(workspaceId: string, userId: string): Promise<SavedView[] | null>;
  create(
    workspaceId: string,
    userId: string,
    input: CreateSavedViewInput,
  ): Promise<SavedViewWriteResult>;
  update(
    workspaceId: string,
    viewId: string,
    userId: string,
    input: UpdateSavedViewInput,
  ): Promise<SavedViewWriteResult>;
  delete(workspaceId: string, viewId: string, userId: string): Promise<SavedViewWriteResult>;
};
