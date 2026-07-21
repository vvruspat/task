"use client";

import { Avatar, Badge, Button, DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  Bell,
  Bot,
  Check,
  ChevronRight,
  Columns3,
  FolderKanban,
  Grid3X3,
  Layers3,
  List,
  LogOut,
  type LucideIcon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  UserRound,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n/i18n";
import type { MessageKey } from "../lib/i18n/messages";
import { isNotificationFeed, notificationsReadEvent } from "../lib/notifications";
import { useWorkspaceData, workspaceRealtimeEvent } from "../lib/use-workspace-data";
import { buildWorkspaceBreadcrumbs } from "../lib/workspace-breadcrumbs";
import { useWorkspaceStore } from "../lib/workspace-store";
import { workspaceViewHref } from "../lib/workspace-url";
import { AgentDrawer } from "./agent-chat";
import { CreateDialog } from "./create-dialog";
import { WorkspaceOnboarding } from "./workspace-onboarding";

type NavItem = {
  href: string;
  label: MessageKey;
  icon: LucideIcon;
};
const navigation: NavItem[] = [
  { href: "/agent", label: "nav.agent", icon: Bot },
  { href: "/projects", label: "nav.projects", icon: FolderKanban },
  { href: "/views", label: "nav.savedViews", icon: Layers3 },
  { href: "/templates", label: "nav.templates", icon: Workflow },
  { href: "/notifications", label: "nav.notifications", icon: Bell },
  { href: "/settings", label: "common.settings", icon: Settings },
];
const sidebarCompactStorageKey = "task:sidebar-compact";

export function WorkspaceShell({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const { t } = useI18n();
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceState = useWorkspaceData();
  const workspaceData = workspaceState.data;
  const workspace = workspaceData?.workspace;
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId);
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId);
  const selectedProject = getSelectedProject(
    pathname,
    searchParams.get("project"),
    selectedProjectId,
    workspaceData?.projects,
  );
  const setAgentOpen = useWorkspaceStore((state) => state.setAgentOpen);
  const setCreateOpen = useWorkspaceStore((state) => state.setCreateOpen);
  const setCreateViewOpen = useWorkspaceStore((state) => state.setCreateViewOpen);
  const notificationUnreadCount = useWorkspaceStore((state) => state.notificationUnreadCount);
  const setNotificationUnreadCount = useWorkspaceStore((state) => state.setNotificationUnreadCount);
  const routeViewSlug = pathname.match(/^\/w\/[^/]+\/view\/([^/]+)$/)?.[1];
  const selectedViewId =
    searchParams.get("view") ?? (pathname === "/views" ? workspaceData?.views.at(0)?.id : null);
  const breadcrumbs = buildWorkspaceBreadcrumbs(pathname, workspaceData, t);
  useEffect(() => {
    setSidebarCompact(window.localStorage.getItem(sidebarCompactStorageKey) === "true");
  }, []);
  useEffect(() => {
    if (selectedProject !== undefined && selectedProject.id !== selectedProjectId)
      setSelectedProjectId(selectedProject.id);
  }, [selectedProject, selectedProjectId, setSelectedProjectId]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAgentOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAgentOpen]);
  useEffect(() => {
    if (workspace === undefined) return;
    const load = (): void => {
      void fetch(`/api/workspace/notifications?workspaceId=${encodeURIComponent(workspace.id)}`, {
        cache: "no-store",
      })
        .then(async (response): Promise<unknown> => response.json())
        .then((value) => {
          if (isNotificationFeed(value)) setNotificationUnreadCount(value.unreadCount);
        })
        .catch(() => undefined);
    };
    const markRead = (): void => setNotificationUnreadCount(0);
    load();
    window.addEventListener(workspaceRealtimeEvent, load);
    window.addEventListener(notificationsReadEvent, markRead);
    return () => {
      window.removeEventListener(workspaceRealtimeEvent, load);
      window.removeEventListener(notificationsReadEvent, markRead);
    };
  }, [setNotificationUnreadCount, workspace]);
  const toggleSidebar = (): void => {
    setSidebarCompact((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCompactStorageKey, String(next));
      return next;
    });
  };
  const logout = async (): Promise<void> => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };
  if (workspaceState.loading && workspaceData === null) return null;
  if (workspaceState.requiresWorkspace) {
    return <WorkspaceOnboarding refresh={workspaceState.refresh} />;
  }
  return (
    <main className={sidebarCompact ? "workspace sidebar-compact" : "workspace"}>
      <aside className="sidebar">
        <IconButton
          className="sidebar-collapse-button"
          size="1"
          variant="soft"
          color="gray"
          aria-label={sidebarCompact ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          title={sidebarCompact ? t("nav.expandSidebar") : t("nav.collapseSidebar")}
          onClick={toggleSidebar}
        >
          {sidebarCompact ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </IconButton>
        <div className="brand">
          <Link
            className="brand-home"
            href={projectHref("/agent", selectedProject?.id)}
            title={sidebarCompact ? (workspace?.name ?? "tAsk") : undefined}
          >
            <span className="brand-mark">{workspace?.name.slice(0, 2).toUpperCase() ?? "TA"}</span>
            <span>
              <strong>{workspace?.name ?? "tAsk"}</strong>
              <small>{t("common.workspace")}</small>
            </span>
          </Link>
          {workspace !== undefined && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  aria-label={t("nav.workspaceMenu")}
                >
                  <MoreHorizontal size={16} />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger>{t("nav.changeWorkspace")}</DropdownMenu.SubTrigger>
                  <DropdownMenu.SubContent>
                    {workspaceData?.availableWorkspaces.map((item) => (
                      <DropdownMenu.Item
                        key={item.id}
                        onSelect={() =>
                          changeWorkspace(
                            item.id,
                            router,
                            setSelectedWorkspaceId,
                            setSelectedProjectId,
                          )
                        }
                      >
                        {item.name}
                        {item.id === workspace.id && <Check size={14} />}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => router.push("/settings")}>
                  {t("common.settings")}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </div>
        <nav>
          {navigation.map(({ href, label: labelKey, icon: Icon }) => {
            const label = t(labelKey);
            if (href === "/views")
              return (
                <div className="nav-section" key={href}>
                  <div
                    className={
                      pathname === href || routeViewSlug !== undefined
                        ? "nav-item nav-parent active"
                        : "nav-item nav-parent"
                    }
                  >
                    <Link
                      href={projectHref(href, selectedProject?.id)}
                      title={sidebarCompact ? label : undefined}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label={t("views.create")}
                      onClick={() => {
                        setCreateViewOpen(true);
                        router.push(projectHref("/views", selectedProject?.id));
                      }}
                    >
                      <Plus size={13} />
                    </IconButton>
                  </div>
                  {workspaceData?.views.map((view) => (
                    <Link
                      key={view.id}
                      href={
                        workspace === undefined
                          ? savedViewHref(view.id, selectedProject?.id)
                          : workspaceViewHref(workspace.slug, view.slug)
                      }
                      className={
                        (pathname === "/views" && selectedViewId === view.id) ||
                        routeViewSlug === view.slug
                          ? "nav-subitem active"
                          : "nav-subitem"
                      }
                    >
                      {view.layout === "board" ? (
                        <Columns3 size={13} />
                      ) : view.layout === "matrix" ? (
                        <Grid3X3 size={13} />
                      ) : (
                        <List size={13} />
                      )}
                      <span>{view.name}</span>
                    </Link>
                  ))}
                </div>
              );
            return (
              <Link
                key={href}
                href={projectHref(href, selectedProject?.id)}
                title={sidebarCompact ? label : undefined}
                className={
                  pathname === href ||
                  (href === "/projects" &&
                    (pathname.startsWith("/projects/") || /^\/w\/[^/]+\/project\//.test(pathname)))
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Icon size={16} />
                <span>{label}</span>
                {href === "/notifications" && notificationUnreadCount > 0 && (
                  <Badge color="red" size="1">
                    {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button
              className="profile"
              type="button"
              title={
                sidebarCompact
                  ? (workspace?.members.at(0)?.displayName ?? t("nav.user"))
                  : undefined
              }
            >
              <Avatar
                fallback={workspace?.members.at(0)?.displayName.slice(0, 1) ?? "?"}
                size="2"
                color="indigo"
              />
              <span>
                <strong>{workspace?.members.at(0)?.displayName ?? t("nav.user")}</strong>
                <small>{workspace?.members.at(0)?.role ?? t("nav.disconnected")}</small>
              </span>
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item onSelect={() => router.push("/settings/profile")}>
              <UserRound size={14} /> {t("nav.profile")}
            </DropdownMenu.Item>
            <DropdownMenu.Item color="red" onSelect={() => void logout()}>
              <LogOut size={14} /> {t("nav.logout")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </aside>
      <section className="main">
        <header className="topbar">
          <nav aria-label={t("nav.breadcrumbs")} className="topbar-breadcrumbs">
            {breadcrumbs.map((breadcrumb, index) => (
              <span key={`${breadcrumb.href ?? "current"}:${breadcrumb.label}`}>
                {index > 0 && <ChevronRight aria-hidden="true" size={14} />}
                {breadcrumb.href === undefined ? (
                  <strong aria-current="page">{breadcrumb.label}</strong>
                ) : (
                  <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
                )}
              </span>
            ))}
          </nav>
          <div>
            <Button size="1" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> {t("common.create")}
            </Button>
          </div>
        </header>
        <div className="route-content">{children}</div>
      </section>
      <AgentDrawer />
      <CreateDialog />
    </main>
  );
}

type ProjectOption = { id: string; key: string; slug: string; title: string };
function getSelectedProject(
  pathname: string,
  queryProjectId: string | null,
  storedProjectId: string | null,
  projects: readonly ProjectOption[] | undefined,
): ProjectOption | undefined {
  if (projects === undefined) return undefined;
  const detailProjectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const detailProjectSlug = pathname.match(/^\/w\/[^/]+\/project\/([^/]+)$/)?.[1];
  const detailProjectBySlug = projects.find((project) => project.slug === detailProjectSlug)?.id;
  const issueProjectKey = pathname
    .match(/^(?:\/w\/[^/]+)?\/issue\/([a-z][a-z0-9]{1,7})-\d+/i)?.[1]
    ?.toUpperCase();
  const issueProjectId = projects.find((project) => project.key === issueProjectKey)?.id;
  const selectedProjectId =
    detailProjectId ??
    detailProjectBySlug ??
    queryProjectId ??
    issueProjectId ??
    storedProjectId ??
    projects[0]?.id;
  return projects.find((project) => project.id === selectedProjectId);
}
function projectHref(pathname: string, projectId: string | undefined): string {
  return projectId === undefined
    ? pathname
    : `${pathname}?project=${encodeURIComponent(projectId)}`;
}
function savedViewHref(viewId: string, projectId: string | undefined): string {
  const parameters = new URLSearchParams({ view: viewId });
  if (projectId !== undefined) parameters.set("project", projectId);
  return `/views?${parameters.toString()}`;
}
function changeWorkspace(
  workspaceId: string,
  router: ReturnType<typeof useRouter>,
  setSelectedWorkspaceId: (workspaceId: string | null) => void,
  setSelectedProjectId: (projectId: string | null) => void,
): void {
  setSelectedWorkspaceId(workspaceId);
  setSelectedProjectId(null);
  router.push("/agent");
}
