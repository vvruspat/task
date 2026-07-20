import type { SavedView } from "@task/api-client";

export type SavedViewDraft = Pick<
  SavedView,
  "name" | "description" | "projectId" | "layout" | "settings"
>;

export function changeSavedViewLayout(
  draft: SavedViewDraft,
  layout: SavedView["layout"],
): SavedViewDraft {
  return {
    ...draft,
    layout,
    settings: {
      ...draft.settings,
      displayProperties: [...draft.settings.displayProperties],
      filters: [...(draft.settings.filters ?? [])],
    },
  };
}
