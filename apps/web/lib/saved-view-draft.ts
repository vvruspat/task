import type { SavedView } from "@task/api-client";

export type SavedViewDraft = Pick<
  SavedView,
  "name" | "description" | "projectId" | "layout" | "settings"
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
