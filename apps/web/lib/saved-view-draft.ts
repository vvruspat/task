import type { SavedView } from "@task/api-client";

export type SavedViewDraft = Pick<
  SavedView,
  "name" | "description" | "projectId" | "visibility" | "layout" | "settings"
>;

export function changeSavedViewLayout(
  draft: SavedViewDraft,
  layout: SavedView["layout"],
): SavedViewDraft {
  const shouldApplyBoardGrouping =
    layout === "board" && draft.layout !== "board" && draft.settings.subGrouping === "none";
  return {
    ...draft,
    layout,
    settings: {
      ...draft.settings,
      subGrouping: shouldApplyBoardGrouping ? "parent_task" : draft.settings.subGrouping,
      displayProperties: [...draft.settings.displayProperties],
      filters: [...(draft.settings.filters ?? [])],
    },
  };
}

export function duplicateSavedViewDraft(
  draft: SavedViewDraft,
  name: string,
  visibility: SavedView["visibility"],
): SavedViewDraft {
  return {
    ...draft,
    name,
    visibility,
    settings: {
      ...draft.settings,
      displayProperties: [...draft.settings.displayProperties],
      filters: draft.settings.filters.map((filter) => ({ ...filter })),
    },
  };
}
