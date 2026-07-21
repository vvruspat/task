export type WorkspaceBreadcrumb = {
  href?: string;
  label: string;
};

export type WorkspaceBreadcrumbData = {
  projects: ReadonlyArray<{ id: string; key: string; slug: string; title: string }>;
  views: ReadonlyArray<{ name: string; slug: string }>;
  workspace: { name: string; slug: string };
};

const routeLabels: Readonly<Record<string, string>> = {
  "/agent": "Agent",
  "/agent-history": "Агент",
  "/confirmations": "Подтверждения",
  "/notifications": "Уведомления",
  "/kanban": "Доска",
  "/matrix": "Матрица",
  "/projects": "Проекты",
  "/settings": "Настройки",
  "/table": "Таблица",
  "/templates": "Шаблоны",
  "/views": "Views",
};

export function buildWorkspaceBreadcrumbs(
  pathname: string,
  data: WorkspaceBreadcrumbData | null,
): WorkspaceBreadcrumb[] {
  const workspaceCrumb: WorkspaceBreadcrumb = {
    href: "/agent",
    label: data?.workspace.name ?? "tAsk",
  };
  const viewSlug = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1];
  if (viewSlug !== undefined) {
    const view = data?.views.find((item) => item.slug === decodeSegment(viewSlug));
    return [workspaceCrumb, { href: "/views", label: "Views" }, { label: view?.name ?? "View" }];
  }

  const projectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const projectSlug = pathname.match(/^\/w\/[^/]+\/project\/([^/]+)$/)?.[1];
  if (projectId !== undefined || projectSlug !== undefined) {
    const project = data?.projects.find(
      (item) => item.id === projectId || item.slug === decodeSegment(projectSlug ?? ""),
    );
    return [
      workspaceCrumb,
      { href: "/projects", label: "Проекты" },
      { label: project?.title ?? "Проект" },
    ];
  }

  const issueIdentifier = pathname.match(/^(?:\/w\/[^/]+)?\/issue\/([^/]+)/)?.[1];
  if (issueIdentifier !== undefined) {
    const decodedIdentifier = decodeSegment(issueIdentifier).toUpperCase();
    const projectKey = decodedIdentifier.split("-")[0];
    const project = data?.projects.find((item) => item.key === projectKey);
    const projectHref =
      data !== null && project !== undefined
        ? workspaceProjectBreadcrumbHref(data.workspace.slug, project.slug)
        : "/projects";
    return [
      workspaceCrumb,
      { href: projectHref, label: project?.title ?? "Проект" },
      { label: decodedIdentifier },
    ];
  }

  if (pathname === "/settings/telegram") {
    return [workspaceCrumb, { href: "/settings", label: "Настройки" }, { label: "Telegram" }];
  }

  return [workspaceCrumb, { label: routeLabels[pathname] ?? "Рабочее пространство" }];
}

function workspaceProjectBreadcrumbHref(workspaceSlug: string, projectSlug: string): string {
  return `/w/${encodeURIComponent(workspaceSlug)}/project/${encodeURIComponent(projectSlug)}`;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
