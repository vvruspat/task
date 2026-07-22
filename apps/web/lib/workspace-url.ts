import { issueIdentifier, issueTitleSlug } from "./issue-url.ts";

function segment(value: string): string {
  return encodeURIComponent(value);
}

export type WorkspacePage =
  | "agent"
  | "agent-history"
  | "kanban"
  | "notifications"
  | "projects"
  | "settings"
  | "settings/profile"
  | "settings/telegram"
  | "templates"
  | "views";

export type WorkspaceNavigationProject = Readonly<{
  id: string;
  key: string;
  slug: string;
}>;

export type WorkspaceNavigationView = Readonly<{
  id: string;
  projectId?: string | null;
  slug: string;
}>;

export type WorkspaceNavigationData = Readonly<{
  projects: readonly WorkspaceNavigationProject[];
  views: readonly WorkspaceNavigationView[];
  workspace: Readonly<{ id: string; slug: string }>;
}>;

const legacyWorkspacePages: Readonly<Record<string, WorkspacePage>> = {
  "/agent": "agent",
  "/agent-history": "agent-history",
  "/confirmations": "notifications",
  "/dashboard": "agent",
  "/kanban": "kanban",
  "/matrix": "views",
  "/my-tasks": "views",
  "/notifications": "notifications",
  "/projects": "projects",
  "/settings": "settings",
  "/settings/profile": "settings/profile",
  "/settings/telegram": "settings/telegram",
  "/table": "views",
  "/templates": "templates",
  "/views": "views",
};

export function workspacePageHref(
  workspaceSlug: string,
  page: WorkspacePage,
  options: Readonly<{ projectSlug?: string | null; skillId?: string | null }> = {},
): string {
  const parameters = new URLSearchParams();
  if (options.projectSlug !== undefined && options.projectSlug !== null) {
    parameters.set("project", options.projectSlug);
  }
  if (page === "templates" && options.skillId !== undefined && options.skillId !== null) {
    parameters.set("skill", options.skillId);
  }
  const query = parameters.toString();
  const pathname = `/w/${segment(workspaceSlug)}/${page}`;
  return query.length === 0 ? pathname : `${pathname}?${query}`;
}

export function workspacePageSupportsProject(page: WorkspacePage): boolean {
  return page === "agent" || page === "kanban" || page === "templates" || page === "views";
}

export function workspacePageFromPath(pathname: string): WorkspacePage | null {
  const legacyPage = legacyWorkspacePages[pathname];
  if (legacyPage !== undefined) return legacyPage;
  const match = pathname.match(/^\/w\/[^/]+\/(.+)$/);
  const candidate = match?.[1];
  return candidate !== undefined && isWorkspacePage(candidate) ? candidate : null;
}

export function resolveWorkspaceRouteProject(
  pathname: string,
  queryProject: string | null,
  storedProjectId: string | null,
  projects: readonly WorkspaceNavigationProject[],
  views: readonly WorkspaceNavigationView[],
): WorkspaceNavigationProject | undefined {
  const projectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const projectSlug = pathname.match(/^\/w\/[^/]+\/project\/([^/]+)$/)?.[1];
  const directProject = projects.find(
    (project) => project.id === projectId || project.slug === decodeSegment(projectSlug),
  );
  if (directProject !== undefined) return directProject;

  const viewSlug = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1];
  const viewProjectId = views.find((view) => view.slug === decodeSegment(viewSlug))?.projectId;
  const viewProject = projects.find((project) => project.id === viewProjectId);
  if (viewProject !== undefined) return viewProject;

  const issueProjectKey = pathname
    .match(/^(?:\/w\/[^/]+)?\/issue\/([a-z][a-z0-9]{1,7})-\d+/i)?.[1]
    ?.toUpperCase();
  const issueProject = projects.find((project) => project.key === issueProjectKey);
  if (issueProject !== undefined) return issueProject;

  const queryProjectMatch = projects.find(
    (project) => project.id === queryProject || project.slug === queryProject,
  );
  if (queryProjectMatch !== undefined) return queryProjectMatch;
  if (pathname.startsWith("/w/")) return undefined;
  return projects.find((project) => project.id === storedProjectId) ?? projects.at(0);
}

export function canonicalWorkspaceRoute(
  pathname: string,
  query: Readonly<{
    project: string | null;
    skill: string | null;
    view: string | null;
  }>,
  data: WorkspaceNavigationData,
  storedProjectId: string | null,
): string | null {
  const canonicalWorkspaceMatch = pathname.match(/^\/w\/([^/]+)(\/.*)$/);
  const canonicalWorkspaceSegment = canonicalWorkspaceMatch?.[1];
  const canonicalWorkspaceSelector = decodeSegment(canonicalWorkspaceSegment);
  if (
    canonicalWorkspaceSelector !== undefined &&
    canonicalWorkspaceSelector !== data.workspace.id &&
    canonicalWorkspaceSelector !== data.workspace.slug
  ) {
    return null;
  }
  if (
    canonicalWorkspaceSelector === data.workspace.id &&
    /^\/w\/[^/]+\/(?:issue|project|view)\//.test(pathname)
  ) {
    return `/w/${segment(data.workspace.slug)}${canonicalWorkspaceMatch?.[2] ?? ""}`;
  }

  if (/^\/w\/[^/]+\/(?:issue|project|view)\//.test(pathname)) return null;

  const legacyProjectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  if (legacyProjectId !== undefined) {
    const project = data.projects.find((item) => item.id === decodeSegment(legacyProjectId));
    return project === undefined
      ? workspacePageHref(data.workspace.slug, "projects")
      : workspaceProjectHref(data.workspace.slug, project.slug);
  }

  if (pathname.startsWith("/issue/")) {
    return `/w/${segment(data.workspace.slug)}${pathname}`;
  }

  const page = workspacePageFromPath(pathname);
  if (page === null) return null;
  if (page === "views") {
    const requestedView = data.views.find((view) => view.id === query.view);
    const firstView = requestedView ?? data.views.at(0);
    if (firstView !== undefined && (pathname === "/views" || pathname.endsWith("/views"))) {
      return workspaceViewHref(data.workspace.slug, firstView.slug);
    }
  }

  const selectedProject = resolveWorkspaceRouteProject(
    pathname,
    query.project,
    storedProjectId,
    data.projects,
    data.views,
  );
  const desiredHref = workspacePageHref(data.workspace.slug, page, {
    projectSlug:
      workspacePageSupportsProject(page) && selectedProject !== undefined
        ? selectedProject.slug
        : null,
    skillId: query.skill,
  });
  const currentQuery = new URLSearchParams();
  if (query.project !== null) currentQuery.set("project", query.project);
  if (page === "templates" && query.skill !== null) currentQuery.set("skill", query.skill);
  const currentParameters = currentQuery.toString();
  const currentHref =
    currentParameters.length === 0 ? pathname : `${pathname}?${currentParameters}`;
  return desiredHref === currentHref ? null : desiredHref;
}

export function workspaceProjectHref(workspaceSlug: string, projectSlug: string): string {
  return `/w/${segment(workspaceSlug)}/project/${segment(projectSlug)}`;
}

export function workspaceViewHref(workspaceSlug: string, viewSlug: string): string {
  return `/w/${segment(workspaceSlug)}/view/${segment(viewSlug)}`;
}

export function workspaceIssueHref(
  workspaceSlug: string,
  projectKey: string,
  number: number,
  title: string,
): string {
  return `/w/${segment(workspaceSlug)}/issue/${segment(issueIdentifier(projectKey, number))}/${segment(issueTitleSlug(title))}`;
}

function isWorkspacePage(value: string): value is WorkspacePage {
  return (
    value === "agent" ||
    value === "agent-history" ||
    value === "kanban" ||
    value === "notifications" ||
    value === "projects" ||
    value === "settings" ||
    value === "settings/profile" ||
    value === "settings/telegram" ||
    value === "templates" ||
    value === "views"
  );
}

function decodeSegment(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
