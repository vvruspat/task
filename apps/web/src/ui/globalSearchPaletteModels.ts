import type { SearchPage } from "@task/api-client";
import type { WorkspaceNavigationState, WorkspaceRouteId } from "./navigation.js";

export type PaletteCommand = {
  description: string;
  id: `route-${WorkspaceRouteId}` | "create-project" | "create-task";
  label: string;
  navigation: WorkspaceNavigationState;
};

export type SearchResult = SearchPage["items"][number];

export type PaletteItem =
  | { kind: "command"; value: PaletteCommand }
  | { kind: "result"; value: SearchResult };

const commandDefinitions: Array<{
  description: string;
  id: PaletteCommand["id"];
  label: string;
  routeId: WorkspaceRouteId;
}> = [
  {
    description: "Open workspace overview",
    id: "route-dashboard",
    label: "Dashboard",
    routeId: "dashboard",
  },
  {
    description: "Browse workspace projects",
    id: "route-projects",
    label: "Projects",
    routeId: "projects",
  },
  { description: "Open the task table", id: "route-table", label: "Task table", routeId: "table" },
  {
    description: "Open task skill templates",
    id: "route-templates",
    label: "Templates",
    routeId: "templates",
  },
  {
    description: "Open workspace settings",
    id: "route-settings",
    label: "Settings",
    routeId: "settings",
  },
  {
    description: "Open Dashboard to create a project",
    id: "create-project",
    label: "Create project",
    routeId: "dashboard",
  },
  {
    description: "Open Dashboard to create a task",
    id: "create-task",
    label: "Create task",
    routeId: "dashboard",
  },
];

export function buildPaletteCommands(query: string): PaletteCommand[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return commandDefinitions
    .filter((command) =>
      normalizedQuery.length === 0
        ? true
        : `${command.label} ${command.description}`.toLocaleLowerCase().includes(normalizedQuery),
    )
    .map((command) => ({
      description: command.description,
      id: command.id,
      label: command.label,
      navigation: { projectId: null, routeId: command.routeId, taskId: null },
    }));
}

export function buildPaletteItems(query: string, searchPage: SearchPage | null): PaletteItem[] {
  const commands = buildPaletteCommands(query).map(
    (value): PaletteItem => ({ kind: "command", value }),
  );
  const results = (searchPage?.items ?? []).map(
    (value): PaletteItem => ({ kind: "result", value }),
  );
  return [...commands, ...results];
}

export function getNextPaletteIndex(
  currentIndex: number,
  itemCount: number,
  direction: "next" | "previous",
): number {
  if (itemCount === 0) return -1;
  if (currentIndex < 0) return direction === "next" ? 0 : itemCount - 1;
  return direction === "next"
    ? (currentIndex + 1) % itemCount
    : (currentIndex - 1 + itemCount) % itemCount;
}

export function isPaletteEscapeKey(key: string): boolean {
  return key === "Escape";
}

export function isWorkspaceSearchShortcut(input: {
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
}): boolean {
  return (input.metaKey || input.ctrlKey) && input.key.toLocaleLowerCase() === "k";
}

export function shouldAcceptSearchSettlement(
  expectedVersion: number,
  currentVersion: number,
): boolean {
  return expectedVersion === currentVersion;
}

export function getSearchResultNavigation(result: SearchResult): WorkspaceNavigationState {
  if (result.type === "project") {
    return { projectId: result.id, routeId: "projects", taskId: null };
  }
  if (result.type === "task") {
    return { projectId: result.projectId, routeId: "table", taskId: result.id };
  }
  if (result.type === "task_skill") {
    return { projectId: null, routeId: "templates", taskId: null };
  }
  return { projectId: null, routeId: "settings", taskId: null };
}
