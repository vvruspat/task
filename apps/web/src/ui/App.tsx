import type { components } from "@task/api-client";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Columns3,
  Command,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Table2,
} from "lucide-react";
import type { ComponentType, ReactElement, SVGProps } from "react";
import { lazy, Suspense, useMemo, useState } from "react";

const LazyDashboardView = lazy(() => import("./views/DashboardView.js"));
const LazyWorkspaceView = lazy(() => import("./views/WorkspaceView.js"));

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type AppRoute = {
  id: string;
  label: string;
  description: string;
  icon: IconComponent;
};

const routes: AppRoute[] = [
  {
    id: "my-tasks",
    label: "My Tasks",
    description: "Focused assignment and overdue queue.",
    icon: CheckCircle2,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Workspace projects and active releases.",
    icon: FolderKanban,
  },
  {
    id: "kanban",
    label: "Kanban",
    description: "Status board for repeated task work.",
    icon: Columns3,
  },
  {
    id: "matrix",
    label: "Matrix",
    description: "Album-style parent and subtask grid.",
    icon: LayoutDashboard,
  },
  {
    id: "table",
    label: "Table",
    description: "Dense task list for scanning and filtering.",
    icon: Table2,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Task skills for songs, releases, and workflows.",
    icon: ClipboardList,
  },
  {
    id: "agent",
    label: "Agent History",
    description: "Telegram and web agent run audit.",
    icon: Bot,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Members, Telegram linking, and workspace controls.",
    icon: Settings,
  },
];

const sampleProjects: ProjectSummary[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Album release",
    description: "Production board for the next release.",
    status: "active",
    position: "1000",
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Live rehearsal",
    description: "Set list preparation and stage notes.",
    status: "active",
    position: "2000",
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
];

const sampleTasks: TaskSummary[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    projectId: "11111111-1111-4111-8111-111111111111",
    parentTaskId: null,
    title: "Intro",
    description: "Create the intro song structure.",
    statusId: null,
    assigneeUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    position: "1000",
    dueAt: "2026-07-18T10:00:00.000Z",
    sourceSkillId: "55555555-5555-4555-8555-555555555555",
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    projectId: "11111111-1111-4111-8111-111111111111",
    parentTaskId: "33333333-3333-4333-8333-333333333333",
    title: "Bass",
    description: "Record and review bass part.",
    statusId: null,
    assigneeUserId: null,
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    position: "2000",
    dueAt: null,
    sourceSkillId: "55555555-5555-4555-8555-555555555555",
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
];

const sampleSkills: TaskSkillSummary[] = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Song",
    description: "Default song production task tree.",
    aliases: ["track", "single"],
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  },
];

export function App(): ReactElement {
  const [activeRouteId, setActiveRouteId] = useState(routes[0]?.id ?? "my-tasks");
  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? routes[0],
    [activeRouteId],
  );

  if (activeRoute === undefined) {
    throw new Error("Application routes are not configured.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            t
          </div>
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>tAsk</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {routes.map((route) => (
            <button
              className={route.id === activeRoute.id ? "nav-item is-active" : "nav-item"}
              key={route.id}
              onClick={() => setActiveRouteId(route.id)}
              title={route.description}
              type="button"
            >
              <route.icon aria-hidden="true" className="nav-icon" />
              <span>{route.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="icon-button" title="Toggle navigation" type="button">
            <PanelLeft aria-hidden="true" />
          </button>
          <label className="command-bar">
            <Search aria-hidden="true" />
            <input
              aria-label="Search tasks and projects"
              placeholder="Search tasks, projects, skills"
            />
          </label>
          <button className="primary-action" type="button">
            <Command aria-hidden="true" />
            <span>Ask agent</span>
          </button>
        </header>

        <section className="route-header" aria-labelledby="route-title">
          <div>
            <p className="eyebrow">Current view</p>
            <h2 id="route-title">{activeRoute.label}</h2>
            <p>{activeRoute.description}</p>
          </div>
          <ul className="status-strip" aria-label="Workspace status summary">
            <li>
              <ListTodo aria-hidden="true" />
              {sampleTasks.length} tasks
            </li>
            <li>
              <FolderKanban aria-hidden="true" />
              {sampleProjects.length} projects
            </li>
            <li>
              <Sparkles aria-hidden="true" />
              {sampleSkills.length} skill
            </li>
            <li>
              <CalendarClock aria-hidden="true" />1 due soon
            </li>
          </ul>
        </section>

        <Suspense fallback={<div className="loading-state">Loading view</div>}>
          {activeRoute.id === "my-tasks" ? (
            <LazyDashboardView
              projects={sampleProjects}
              skills={sampleSkills}
              tasks={sampleTasks}
            />
          ) : (
            <LazyWorkspaceView
              route={activeRoute}
              projects={sampleProjects}
              skills={sampleSkills}
              tasks={sampleTasks}
            />
          )}
        </Suspense>
      </section>
    </main>
  );
}
