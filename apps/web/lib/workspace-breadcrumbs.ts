import type { SavedView } from "@task/api-client";

export type WorkspaceBreadcrumb = {
  href?: string;
  label: string;
};

export type WorkspaceBreadcrumbData = {
  projects: ReadonlyArray<{ id: string; key: string; slug: string; title: string }>;
  views: ReadonlyArray<Pick<SavedView, "layout" | "name" | "projectId" | "slug">>;
  workspace: { name: string; slug: string };
};

const routeLabels: Readonly<Record<string, MessageKey>> = {
  "/agent": "nav.agent",
  "/agent-history": "nav.agentHistory",
  "/confirmations": "nav.confirmations",
  "/notifications": "nav.notifications",
  "/kanban": "nav.kanban",
  "/matrix": "nav.matrix",
  "/projects": "nav.projects",
  "/settings": "common.settings",
  "/settings/profile": "profile.title",
  "/table": "nav.table",
  "/templates": "nav.templates",
  "/views": "nav.savedViews",
};

export function buildWorkspaceBreadcrumbs(
  pathname: string,
  data: WorkspaceBreadcrumbData | null,
  t: (key: MessageKey) => string,
): WorkspaceBreadcrumb[] {
  const workspaceCrumb: WorkspaceBreadcrumb = {
    href: "/agent",
    label: data?.workspace.name ?? "tAsk",
  };
  const viewSlug = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1];
  if (viewSlug !== undefined) {
    const view = data?.views.find((item) => item.slug === decodeSegment(viewSlug));
    return [
      workspaceCrumb,
      { href: "/views", label: t("nav.savedViews") },
      { label: view?.name ?? t("views.view") },
    ];
  }

  const projectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const projectSlug = pathname.match(/^\/w\/[^/]+\/project\/([^/]+)$/)?.[1];
  if (projectId !== undefined || projectSlug !== undefined) {
    const project = data?.projects.find(
      (item) => item.id === projectId || item.slug === decodeSegment(projectSlug ?? ""),
    );
    return [
      workspaceCrumb,
      { href: "/projects", label: t("nav.projects") },
      { label: project?.title ?? t("common.project") },
    ];
  }

  const issueIdentifier = pathname.match(/^(?:\/w\/[^/]+)?\/issue\/([^/]+)/)?.[1];
  if (issueIdentifier !== undefined) {
    const decodedIdentifier = decodeSegment(issueIdentifier).toUpperCase();
    const projectKey = decodedIdentifier.split("-")[0];
    const project = data?.projects.find((item) => item.key === projectKey);
    const projectView =
      project === undefined
        ? undefined
        : data?.views.find((view) => view.projectId === project.id && view.layout === "board");
    const projectHref = projectBreadcrumbHref(data, project, projectView);
    return [
      workspaceCrumb,
      { href: projectHref, label: project?.title ?? t("common.project") },
      { label: decodedIdentifier },
    ];
  }

  if (pathname === "/settings/telegram") {
    return [
      workspaceCrumb,
      { href: "/settings", label: t("common.settings") },
      { label: "Telegram" },
    ];
  }

  const routeLabel = routeLabels[pathname];
  return [
    workspaceCrumb,
    { label: routeLabel === undefined ? t("common.workspace") : t(routeLabel) },
  ];
}

function projectBreadcrumbHref(
  data: WorkspaceBreadcrumbData | null,
  project: WorkspaceBreadcrumbData["projects"][number] | undefined,
  projectView: WorkspaceBreadcrumbData["views"][number] | undefined,
): string {
  if (data === null || project === undefined) return "/projects";
  if (projectView !== undefined) {
    return `/w/${encodeURIComponent(data.workspace.slug)}/view/${encodeURIComponent(projectView.slug)}`;
  }
  return `/kanban?project=${encodeURIComponent(project.id)}`;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

import type { MessageKey } from "./i18n/messages";
