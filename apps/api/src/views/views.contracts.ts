export const savedViewLayouts = ["list", "board"] as const;
export type SavedViewLayout = (typeof savedViewLayouts)[number];

export const savedViewGroupings = [
  "none",
  "status",
  "project",
  "parent_task",
] as const;
export type SavedViewGrouping = (typeof savedViewGroupings)[number];

export const savedViewOrderings = [
  "manual",
  "title",
  "status",
  "created_at",
  "updated_at",
  "due_at",
] as const;
export type SavedViewOrdering = (typeof savedViewOrderings)[number];

export const savedViewDisplayProperties = [
  "status",
  "project",
  "assignee",
  "due_at",
  "created_at",
  "updated_at",
] as const;
export type SavedViewDisplayProperty =
  (typeof savedViewDisplayProperties)[number];

export const savedViewFilterFields = [
  "status",
  "assignee",
  "creator",
  "project",
  "due_date",
  "content",
] as const;
export type SavedViewFilterField = (typeof savedViewFilterFields)[number];

export const savedViewFilterOperators = [
  "is",
  "is_not",
  "before",
  "after",
  "contains",
  "not_contains",
  "is_empty",
  "is_not_empty",
] as const;
export type SavedViewFilterOperator = (typeof savedViewFilterOperators)[number];

export type SavedViewFilter = {
  field: SavedViewFilterField;
  operator: SavedViewFilterOperator;
  value: string | null;
};

export type SavedViewSettings = {
  grouping: SavedViewGrouping;
  subGrouping: SavedViewGrouping;
  ordering: SavedViewOrdering;
  orderDirection: "asc" | "desc";
  showSubtasks: boolean;
  showEmptyGroups: boolean;
  displayProperties: SavedViewDisplayProperty[];
  filters: SavedViewFilter[];
};

export type SavedView = {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  layout: SavedViewLayout;
  settings: SavedViewSettings;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSavedViewInput = {
  name: string;
  description?: string | null;
  projectId?: string | null;
  layout: SavedViewLayout;
  settings: SavedViewSettings;
};

export type UpdateSavedViewInput = {
  name?: string;
  description?: string | null;
  projectId?: string | null;
  layout?: SavedViewLayout;
  settings?: SavedViewSettings;
};
