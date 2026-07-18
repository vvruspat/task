"use client";

import { Avatar, Badge, Button, IconButton, Select } from "@radix-ui/themes";
import {
  Bell,
  Bot,
  CheckSquare,
  Columns3,
  FolderKanban,
  History,
  Layers3,
  LayoutDashboard,
  List,
  Plus,
  Settings,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useWorkspaceData } from "../lib/use-workspace-data";
import { useWorkspaceStore } from "../lib/workspace-store";
import { AgentDrawer } from "./agent-chat";
import { CreateDialog } from "./create-dialog";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
};
const navigation: NavItem[] = [
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/my-tasks", label: "Мои задачи", icon: CheckSquare },
  { href: "/projects", label: "Проекты", icon: FolderKanban },
  { href: "/views", label: "Views", icon: Layers3 },
  { href: "/templates", label: "Шаблоны", icon: Workflow },
  { href: "/confirmations", label: "Подтверждения", icon: Bell, badge: "3" },
  { href: "/agent-history", label: "История агента", icon: History },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function WorkspaceShell({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceData = useWorkspaceData().data;
  const workspace = workspaceData?.workspace;
  const selectedProjectId = useWorkspaceStore(
    (state) => state.selectedProjectId,
  );
  const setSelectedProjectId = useWorkspaceStore(
    (state) => state.setSelectedProjectId,
  );
  const selectedProject = getSelectedProject(
    pathname,
    searchParams.get("project"),
    selectedProjectId,
    workspaceData?.projects,
  );
  const setAgentOpen = useWorkspaceStore((state) => state.setAgentOpen);
  const setCreateOpen = useWorkspaceStore((state) => state.setCreateOpen);
  const setCreateViewOpen = useWorkspaceStore(
    (state) => state.setCreateViewOpen,
  );
  const selectedViewId =
    searchParams.get("view") ??
    (pathname === "/views" ? workspaceData?.views.at(0)?.id : null);
  useEffect(() => {
    if (
      selectedProject !== undefined &&
      selectedProject.id !== selectedProjectId
    )
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
  return (
    <main className="workspace">
      <aside className="sidebar">
        <Link
          className="brand"
          href={projectHref("/dashboard", selectedProject?.id)}
        >
          <span className="brand-mark">
            {workspace?.name.slice(0, 2).toUpperCase() ?? "TA"}
          </span>
          <span>
            <strong>{workspace?.name ?? "tAsk"}</strong>
            <small>Workspace</small>
          </span>
        </Link>
        <nav>
          {navigation.map(({ href, label, icon: Icon, badge }) => {
            if (href === "/views")
              return (
                <div className="nav-section" key={href}>
                  <div
                    className={
                      pathname === href
                        ? "nav-item nav-parent active"
                        : "nav-item nav-parent"
                    }
                  >
                    <Link href={projectHref(href, selectedProject?.id)}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label="Создать view"
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
                      href={savedViewHref(view.id, selectedProject?.id)}
                      className={
                        pathname === "/views" && selectedViewId === view.id
                          ? "nav-subitem active"
                          : "nav-subitem"
                      }
                    >
                      {view.layout === "board" ? (
                        <Columns3 size={13} />
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
                className={
                  pathname === href ||
                  (href === "/projects" && pathname.startsWith("/projects/"))
                    ? "nav-item active"
                    : "nav-item"
                }
              >
                <Icon size={16} />
                <span>{label}</span>
                {badge && (
                  <Badge color="red" size="1">
                    {badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="profile">
          <Avatar
            fallback={workspace?.members.at(0)?.displayName.slice(0, 1) ?? "?"}
            size="2"
            color="indigo"
          />
          <span>
            <strong>
              {workspace?.members.at(0)?.displayName ?? "Пользователь"}
            </strong>
            <small>{workspace?.members.at(0)?.role ?? "Нет подключения"}</small>
          </span>
        </div>
      </aside>
      <section className="main">
        <header className="topbar">
          {selectedProject !== undefined && (
            <Select.Root
              value={selectedProject.id}
              onValueChange={(projectId) =>
                changeProject(pathname, projectId, router, setSelectedProjectId)
              }
            >
              <Select.Trigger aria-label="Выбранный проект" />
              <Select.Content>
                {workspaceData?.projects.map((project) => (
                  <Select.Item key={project.id} value={project.id}>
                    {project.title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
          <div>
            <Button size="1" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> Создать
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

type ProjectOption = { id: string; title: string };
function getSelectedProject(
  pathname: string,
  queryProjectId: string | null,
  storedProjectId: string | null,
  projects: readonly ProjectOption[] | undefined,
): ProjectOption | undefined {
  if (projects === undefined) return undefined;
  const detailProjectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const selectedProjectId =
    detailProjectId ?? queryProjectId ?? storedProjectId ?? projects[0]?.id;
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
function changeProject(
  pathname: string,
  projectId: string,
  router: ReturnType<typeof useRouter>,
  setSelectedProjectId: (projectId: string | null) => void,
): void {
  setSelectedProjectId(projectId);
  if (/^\/projects\/[^/]+$/.test(pathname)) {
    router.push(`/projects/${projectId}`);
    return;
  }
  router.push(`${pathname}?project=${encodeURIComponent(projectId)}`);
}
