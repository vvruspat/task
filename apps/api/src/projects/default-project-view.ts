import type { CreateSavedViewInput } from "../views/views.contracts.js";

export function buildDefaultProjectView(
  projectId: string,
  projectTitle: string,
): CreateSavedViewInput {
  return {
    name: projectTitle,
    description: null,
    projectId,
    layout: "board",
    settings: {
      grouping: "status",
      subGrouping: "none",
      ordering: "manual",
      orderDirection: "asc",
      showSubtasks: true,
      showEmptyGroups: true,
      displayProperties: ["status", "assignee", "due_at"],
      filters: [{ field: "project", operator: "is", value: projectId }],
    },
  };
}
