export type WorkspaceBootstrapScope = "project" | "shell" | "templates" | "view";

export type WorkspaceBootstrapRequest = Readonly<{
  includeProjectTasks: boolean;
  includeTaskSkills: boolean;
  projectSelector: string | null;
  scope: WorkspaceBootstrapScope;
  viewSelector: string | null;
}>;

export function workspaceBootstrapRequestForRoute(
  pathname: string,
  query: Readonly<{ project: string | null; view: string | null }>,
): WorkspaceBootstrapRequest {
  const directProject =
    pathname.match(/^\/w\/[^/]+\/project\/([^/]+)$/)?.[1] ??
    pathname.match(/^\/projects\/([^/]+)$/)?.[1] ??
    null;
  if (directProject !== null) {
    return {
      includeProjectTasks: false,
      includeTaskSkills: false,
      projectSelector: decodeSegment(directProject),
      scope: "project",
      viewSelector: null,
    };
  }
  const issueProjectKey = pathname
    .match(/^(?:\/w\/[^/]+)?\/issue\/([a-z][a-z0-9]{1,7})-\d+/i)?.[1]
    ?.toUpperCase();
  if (issueProjectKey !== undefined) {
    return {
      includeProjectTasks: true,
      includeTaskSkills: true,
      projectSelector: issueProjectKey,
      scope: "project",
      viewSelector: null,
    };
  }

  const page = pathname.match(/^\/w\/[^/]+\/(.+)$/)?.[1] ?? pathname.slice(1);
  if (page === "kanban" && query.project !== null) {
    return {
      includeProjectTasks: true,
      includeTaskSkills: false,
      projectSelector: query.project,
      scope: "project",
      viewSelector: null,
    };
  }
  const directView = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1] ?? null;
  if (directView !== null || page === "views") {
    return {
      includeProjectTasks: true,
      includeTaskSkills: true,
      projectSelector: null,
      scope: "view",
      viewSelector: directView === null ? query.view : decodeSegment(directView),
    };
  }
  if (page === "templates") {
    return {
      includeProjectTasks: false,
      includeTaskSkills: true,
      projectSelector: null,
      scope: "templates",
      viewSelector: null,
    };
  }
  return {
    includeProjectTasks: false,
    includeTaskSkills: false,
    projectSelector: null,
    scope: "shell",
    viewSelector: null,
  };
}

export function workspaceBootstrapRequestKey(
  workspaceSelector: string | null,
  request: WorkspaceBootstrapRequest,
): string {
  return [
    workspaceSelector ?? "default",
    request.scope,
    request.includeProjectTasks ? "tasks" : "metadata",
    request.includeTaskSkills ? "skills" : "no-skills",
    request.projectSelector ?? "",
    request.viewSelector ?? "",
  ].join(":");
}

export function workspaceBootstrapRequestCovers(
  loaded: WorkspaceBootstrapRequest | null,
  requested: WorkspaceBootstrapRequest,
  data: Readonly<{
    projectData: ReadonlyArray<{ projectId: string }>;
    projects: ReadonlyArray<{ id: string; slug: string }>;
    views: ReadonlyArray<{ id: string; slug: string }>;
  }>,
): boolean {
  if (requested.scope === "shell") return true;
  if (loaded === null || loaded.scope !== requested.scope) return false;
  if (requested.includeProjectTasks && !loaded.includeProjectTasks) return false;
  if (requested.includeTaskSkills && !loaded.includeTaskSkills) return false;
  if (requested.scope === "templates") return true;
  if (requested.scope === "project") {
    const requestedProject = data.projects.find(
      (project) =>
        project.id === requested.projectSelector || project.slug === requested.projectSelector,
    );
    return (
      requestedProject !== undefined &&
      data.projectData.some((project) => project.projectId === requestedProject.id)
    );
  }
  const loadedView =
    data.views.find(
      (view) => view.id === loaded.viewSelector || view.slug === loaded.viewSelector,
    ) ?? data.views.at(0);
  const requestedView =
    data.views.find(
      (view) => view.id === requested.viewSelector || view.slug === requested.viewSelector,
    ) ?? data.views.at(0);
  return loadedView !== undefined && requestedView?.id === loadedView.id;
}

export async function mapWithConcurrency<Input, Output>(
  items: readonly Input[],
  concurrency: number,
  mapper: (item: Input, index: number) => Promise<Output>,
): Promise<Output[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer.");
  }
  const results: Array<{ value: Output } | undefined> = new Array(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      const item = items[index];
      if (item === undefined) throw new Error("Workspace bootstrap item is missing.");
      results[index] = { value: await mapper(item, index) };
    }
  }
  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.map((result) => {
    if (result === undefined) throw new Error("Workspace bootstrap result is missing.");
    return result.value;
  });
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
