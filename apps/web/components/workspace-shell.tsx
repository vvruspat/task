"use client";

import {
  Avatar,
  Badge,
  Button,
  Card,
  DropdownMenu,
  IconButton,
  Skeleton,
  Text,
} from "@radix-ui/themes";
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
import {
  notifyWorkspaceDataChanged,
  resetWorkspaceData,
  useWorkspaceData,
  workspaceRealtimeEvent,
} from "../lib/use-workspace-data";
import { buildWorkspaceBreadcrumbs } from "../lib/workspace-breadcrumbs";
import { canLeaveWorkspace, canManageWorkspaceSettings } from "../lib/workspace-contracts";
import type { WorkspaceRealtimeConnectionStatus } from "../lib/workspace-realtime";
import { useWorkspaceStore } from "../lib/workspace-store";
import {
  canonicalWorkspaceRoute,
  resolveWorkspaceRouteProject,
  type WorkspacePage,
  workspacePageFromPath,
  workspacePageHref,
  workspacePageSupportsProject,
  workspaceViewHref,
} from "../lib/workspace-url";
import { AgentDrawer } from "./agent-chat";
import { CreateDialog } from "./create-dialog";
import { WorkspaceCreateDialog } from "./workspace-create-dialog";
import { WorkspaceLeaveDialog } from "./workspace-leave-dialog";
import { WorkspaceOnboarding } from "./workspace-onboarding";

type NavItem = {
  page: WorkspacePage;
  label: MessageKey;
  icon: LucideIcon;
};
const navigation: NavItem[] = [
  { page: "agent", label: "nav.agent", icon: Bot },
  { page: "projects", label: "nav.projects", icon: FolderKanban },
  { page: "views", label: "nav.savedViews", icon: Layers3 },
  { page: "templates", label: "nav.templates", icon: Workflow },
  { page: "notifications", label: "nav.notifications", icon: Bell },
  { page: "settings", label: "common.settings", icon: Settings },
];
const sidebarCompactStorageKey = "task:sidebar-compact";

export function WorkspaceShell({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const { t } = useI18n();
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [workspaceLeaveOpen, setWorkspaceLeaveOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceState = useWorkspaceData();
  const workspaceData = workspaceState.data;
  const workspace = workspaceData?.workspace;
  const currentMember = workspaceData?.currentMember;
  const canManageSettings =
    currentMember !== undefined && canManageWorkspaceSettings(currentMember.role);
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const setSelectedProjectId = useWorkspaceStore((state) => state.setSelectedProjectId);
  const setSelectedWorkspaceId = useWorkspaceStore((state) => state.setSelectedWorkspaceId);
  const selectedProject =
    workspaceData === null
      ? undefined
      : resolveWorkspaceRouteProject(
          pathname,
          searchParams.get("project"),
          selectedProjectId,
          workspaceData.projects,
          workspaceData.views,
        );
  const canonicalHref =
    workspaceData === null
      ? null
      : canonicalWorkspaceRoute(
          pathname,
          {
            project: searchParams.get("project"),
            skill: searchParams.get("skill"),
            view: searchParams.get("view"),
          },
          workspaceData,
          selectedProjectId,
        );
  const activePage = workspacePageFromPath(pathname);
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
    const routeProjectId = selectedProject?.id ?? null;
    if (pathname.startsWith("/w/") && routeProjectId !== selectedProjectId) {
      setSelectedProjectId(routeProjectId);
      return;
    }
    if (selectedProject !== undefined && selectedProject.id !== selectedProjectId) {
      setSelectedProjectId(selectedProject.id);
    }
  }, [pathname, selectedProject, selectedProjectId, setSelectedProjectId]);
  useEffect(() => {
    if (canonicalHref !== null) router.replace(canonicalHref);
  }, [canonicalHref, router]);
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
    resetWorkspaceData();
    setSelectedWorkspaceId(null);
    setSelectedProjectId(null);
    router.replace("/login");
    router.refresh();
  };
  if (workspaceState.loading && workspaceData === null) return <WorkspaceShellSkeleton />;
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
          {workspace === undefined ? (
            <Link className="brand-home" href="/agent" title={t("common.appName")}>
              <span className="brand-mark">{t("common.appName").slice(0, 2).toUpperCase()}</span>
              <span className="brand-copy">
                <strong>{t("common.appName")}</strong>
                <small>{t("common.workspace")}</small>
              </span>
            </Link>
          ) : (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button
                  className="brand-home"
                  type="button"
                  aria-label={t("nav.workspaceMenu")}
                  title={workspace.name}
                >
                  <span className="brand-mark">{workspace.name.slice(0, 2).toUpperCase()}</span>
                  <span className="brand-copy">
                    <strong>{workspace.name}</strong>
                    <small>{t("common.workspace")}</small>
                  </span>
                </button>
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
                            item,
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
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item onSelect={() => setWorkspaceCreateOpen(true)}>
                      <Plus size={14} /> {t("workspace.createNew")}
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Sub>
                {canManageSettings && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      onSelect={() => router.push(workspacePageHref(workspace.slug, "settings"))}
                    >
                      {t("common.settings")}
                    </DropdownMenu.Item>
                  </>
                )}
                {currentMember !== undefined && canLeaveWorkspace(currentMember.role) && (
                  <>
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item color="red" onSelect={() => setWorkspaceLeaveOpen(true)}>
                      <LogOut size={14} /> {t("workspace.leave")}
                    </DropdownMenu.Item>
                  </>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </div>
        <nav>
          {navigation.map(({ page, label: labelKey, icon: Icon }) => {
            if (page === "settings" && !canManageSettings) return null;
            const label = t(labelKey);
            const href =
              workspace === undefined
                ? `/${page}`
                : workspacePageHref(workspace.slug, page, {
                    projectSlug: workspacePageSupportsProject(page)
                      ? (selectedProject?.slug ?? null)
                      : null,
                  });
            if (page === "views")
              return (
                <div className="nav-section" key={page}>
                  <div
                    className={
                      activePage === page || routeViewSlug !== undefined
                        ? "nav-item nav-parent active"
                        : "nav-item nav-parent"
                    }
                  >
                    <Link href={href} title={sidebarCompact ? label : undefined}>
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
                        router.push(href);
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
                          ? `/views?view=${encodeURIComponent(view.id)}`
                          : workspaceViewHref(workspace.slug, view.slug)
                      }
                      className={
                        (activePage === "views" && selectedViewId === view.id) ||
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
                href={href}
                title={sidebarCompact ? label : undefined}
                className={
                  activePage === page ||
                  (page === "projects" &&
                    (pathname.startsWith("/projects/") || /^\/w\/[^/]+\/project\//.test(pathname)))
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Icon size={16} />
                <span>{label}</span>
                {page === "notifications" && notificationUnreadCount > 0 && (
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
            <Button
              className="profile"
              type="button"
              size="2"
              variant="ghost"
              color="gray"
              title={sidebarCompact ? (currentMember?.displayName ?? t("nav.user")) : undefined}
            >
              <Avatar
                fallback={currentMember?.displayName.slice(0, 1) ?? "?"}
                size="2"
                color="indigo"
              />
              <span className="profile-copy">
                <strong>{currentMember?.displayName ?? t("nav.user")}</strong>
                <small>
                  {currentMember === undefined
                    ? t("nav.disconnected")
                    : t(`workspace.role.${currentMember.role}`)}
                </small>
              </span>
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item
              onSelect={() =>
                router.push(
                  workspace === undefined
                    ? "/settings/profile"
                    : workspacePageHref(workspace.slug, "settings/profile"),
                )
              }
            >
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
            <WorkspaceRealtimeStatusBadge status={workspaceState.connectionStatus} />
            <Button size="1" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> {t("common.create")}
            </Button>
          </div>
        </header>
        <div className="route-content">{children}</div>
      </section>
      <AgentDrawer />
      <CreateDialog />
      <WorkspaceCreateDialog
        open={workspaceCreateOpen}
        onOpenChange={setWorkspaceCreateOpen}
        onCreated={(createdWorkspace) =>
          changeWorkspace(createdWorkspace, router, setSelectedWorkspaceId, setSelectedProjectId)
        }
      />
      {workspace !== undefined && currentMember !== undefined && (
        <WorkspaceLeaveDialog
          memberId={currentMember.id}
          open={workspaceLeaveOpen}
          workspaceId={workspace.id}
          workspaceName={workspace.name}
          onOpenChange={setWorkspaceLeaveOpen}
          onLeft={() => {
            const nextWorkspace = workspaceData?.availableWorkspaces.find(
              (item) => item.id !== workspace.id,
            );
            setSelectedWorkspaceId(nextWorkspace?.id ?? null);
            setSelectedProjectId(null);
            router.replace(
              nextWorkspace === undefined
                ? "/agent"
                : workspacePageHref(nextWorkspace.slug, "agent"),
            );
            notifyWorkspaceDataChanged();
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

function WorkspaceShellSkeleton(): ReactNode {
  const { t } = useI18n();
  return (
    <main aria-busy="true" aria-live="polite" className="workspace" role="status">
      <aside className="sidebar">
        <div className="brand">
          <Skeleton height="36px" width="180px" />
        </div>
        <nav aria-label={t("nav.breadcrumbs")}>
          {navigation.map(({ page }) => (
            <Skeleton height="32px" key={page} width="100%" />
          ))}
        </nav>
        <Skeleton height="40px" width="100%" />
      </aside>
      <section className="main">
        <header className="topbar">
          <Skeleton height="24px" width="220px" />
          <Skeleton height="28px" width="96px" />
        </header>
        <div className="route-content">
          <Card className="panel">
            <Text color="gray">{t("workspace.loading")}</Text>
            <Skeleton height="28px" width="45%" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="180px" width="100%" />
          </Card>
        </div>
      </section>
    </main>
  );
}

function WorkspaceRealtimeStatusBadge({
  status,
}: Readonly<{ status: WorkspaceRealtimeConnectionStatus }>): ReactNode {
  const { t } = useI18n();
  if (status === "idle" || status === "live") return null;
  if (status === "offline") {
    return (
      <Badge aria-live="polite" color="red" role="status" variant="soft">
        {t("workspace.realtimeOffline")}
      </Badge>
    );
  }
  return (
    <Badge
      aria-live="polite"
      color={status === "connecting" ? "gray" : "amber"}
      role="status"
      variant="soft"
    >
      {t(
        status === "connecting" ? "workspace.realtimeConnecting" : "workspace.realtimeReconnecting",
      )}
    </Badge>
  );
}

function changeWorkspace(
  workspace: Readonly<{ id: string; slug: string }>,
  router: ReturnType<typeof useRouter>,
  setSelectedWorkspaceId: (workspaceId: string | null) => void,
  setSelectedProjectId: (projectId: string | null) => void,
): void {
  setSelectedWorkspaceId(workspace.id);
  setSelectedProjectId(null);
  router.push(workspacePageHref(workspace.slug, "agent"));
}
