export const workspaceRouteIds = [
  "dashboard",
  "projects",
  "kanban",
  "matrix",
  "table",
  "templates",
  "confirmations",
  "agent",
  "settings",
] as const;

export type WorkspaceRouteId = (typeof workspaceRouteIds)[number];

export type WorkspaceNavigationState = {
  projectId: string | null;
  routeId: WorkspaceRouteId;
};

const defaultNavigationState: WorkspaceNavigationState = {
  projectId: null,
  routeId: "dashboard",
};

export function parseWorkspaceNavigation(search: string): WorkspaceNavigationState {
  const query = new URLSearchParams(search);
  const candidateRouteId = query.get("view");
  const routeId = isWorkspaceRouteId(candidateRouteId)
    ? candidateRouteId
    : defaultNavigationState.routeId;

  return {
    projectId: query.get("project"),
    routeId,
  };
}

export function createWorkspaceNavigationUrl(
  location: Pick<Location, "hash" | "pathname" | "search">,
  state: WorkspaceNavigationState,
): string {
  const query = new URLSearchParams(location.search);
  query.set("view", state.routeId);

  if (state.projectId === null) {
    query.delete("project");
  } else {
    query.set("project", state.projectId);
  }

  const search = query.toString();
  return `${location.pathname}${search.length > 0 ? `?${search}` : ""}${location.hash}`;
}

export function isWorkspaceRouteId(value: string | null): value is WorkspaceRouteId {
  return workspaceRouteIds.some((routeId) => routeId === value);
}
