import type { SavedView } from "@task/api-client";
import type { MessageKey } from "./i18n/messages";
import {
  type WorkspacePage,
  workspacePageFromPath,
  workspacePageHref,
  workspaceViewHref,
} from "./workspace-url.ts";

export type WorkspaceBreadcrumb = {
  href?: string;
  label: string;
};

export type WorkspaceBreadcrumbData = {
  projects: ReadonlyArray<{ id: string; key: string; slug: string; title: string }>;
  views: ReadonlyArray<Pick<SavedView, "layout" | "name" | "projectId" | "slug">>;
  workspace: { name: string; slug: string };
};

const routeLabels: Readonly<Partial<Record<WorkspacePage, MessageKey>>> = {
  agent: "nav.agent",
  "agent-history": "nav.agentHistory",
  kanban: "nav.kanban",
  notifications: "nav.notifications",
  projects: "nav.projects",
  settings: "common.settings",
  "settings/integrations": "integrations.title",
  "settings/profile": "profile.title",
  "settings/telegram": "workspace.telegramTitle",
  templates: "nav.templates",
  views: "nav.savedViews",
};

export function buildWorkspaceBreadcrumbs(
  pathname: string,
  data: WorkspaceBreadcrumbData | null,
  t: (key: MessageKey) => string,
): WorkspaceBreadcrumb[] {
  const workspaceCrumb: WorkspaceBreadcrumb = {
    href: data === null ? "/agent" : workspacePageHref(data.workspace.slug, "agent"),
    label: data?.workspace.name ?? "tAsk",
  };
  const viewSlug = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1];
  if (viewSlug !== undefined) {
    const view = data?.views.find((item) => item.slug === decodeSegment(viewSlug));
    return [
      workspaceCrumb,
      {
        href: data === null ? "/views" : workspacePageHref(data.workspace.slug, "views"),
        label: t("nav.savedViews"),
      },
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
      {
        href: data === null ? "/projects" : workspacePageHref(data.workspace.slug, "projects"),
        label: t("nav.projects"),
      },
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

  if (pathname === "/settings/telegram" || pathname.endsWith("/settings/telegram")) {
    return [
      workspaceCrumb,
      {
        href: data === null ? "/settings" : workspacePageHref(data.workspace.slug, "settings"),
        label: t("common.settings"),
      },
      { label: "Telegram" },
    ];
  }

  const page = workspacePageFromPath(pathname);
  const routeLabel = page === null ? undefined : routeLabels[page];
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
    return workspaceViewHref(data.workspace.slug, projectView.slug);
  }
  return workspacePageHref(data.workspace.slug, "kanban", { projectSlug: project.slug });
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
