import type { TaskApiFetch } from "@task/api-client";
import { MBadge, MBox, MButton, MCard, MFlex, MHeading, MInput, MText } from "@task/ui";
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
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  createWebShellDataLoader,
  createWebShellProjectCreator,
  createWebShellTaskCreator,
  parseWebShellConfig,
  type WebShellData,
  type WebShellEnvironment,
} from "../api/web-shell-data.js";

const LazyDashboardView = lazy(() => import("./views/DashboardView.js"));
const LazyWorkspaceView = lazy(() => import("./views/WorkspaceView.js"));

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

const emptyWebShellData: WebShellData = {
  agentRuns: [],
  projects: [],
  selectedProjectId: null,
  selectedWorkspaceId: null,
  skills: [],
  statuses: [],
  tasks: [],
  workspaces: [],
};

type WebShellLoadState =
  | {
      data: WebShellData;
      status: "loaded";
    }
  | {
      message: string;
      status: "error" | "missing_config";
    }
  | {
      status: "loading";
    };

type FormSubmissionState =
  | {
      status: "idle";
    }
  | {
      status: "submitting";
    }
  | {
      message: string;
      status: "error" | "success";
    };

const webShellEnvironment: WebShellEnvironment = {
  VITE_TASK_API_BASE_URL: import.meta.env.VITE_TASK_API_BASE_URL,
  VITE_TASK_TRUSTED_USER_ID: import.meta.env.VITE_TASK_TRUSTED_USER_ID,
};

export function App(): ReactElement {
  const [activeRouteId, setActiveRouteId] = useState(routes[0]?.id ?? "my-tasks");
  const [projectCreateState, setProjectCreateState] = useState<FormSubmissionState>({
    status: "idle",
  });
  const [taskCreateState, setTaskCreateState] = useState<FormSubmissionState>({ status: "idle" });
  const [loadState, setLoadState] = useState<WebShellLoadState>(() => {
    const configResult = parseWebShellConfig(webShellEnvironment);

    if (configResult.status === "missing_config") {
      return {
        message: configResult.message,
        status: "missing_config",
      };
    }

    return {
      status: "loading",
    };
  });
  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? routes[0],
    [activeRouteId],
  );
  const data = loadState.status === "loaded" ? loadState.data : emptyWebShellData;
  const dueSoonCount = data.tasks.filter((task) => task.dueAt !== null).length;
  const canCreateProject = loadState.status === "loaded" && data.selectedWorkspaceId !== null;
  const canCreateTask =
    loadState.status === "loaded" &&
    data.selectedWorkspaceId !== null &&
    data.selectedProjectId !== null;

  useEffect(() => {
    const configResult = parseWebShellConfig(webShellEnvironment);

    if (configResult.status === "missing_config") {
      return;
    }

    let isCurrent = true;
    const browserFetch: TaskApiFetch = async (url, init) => fetch(url, init);
    const loadData = createWebShellDataLoader({
      config: configResult.config,
      fetch: browserFetch,
    });

    void loadData()
      .then((loadedData) => {
        if (isCurrent) {
          setLoadState({
            data: loadedData,
            status: "loaded",
          });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadState({
            message: readErrorMessage(error),
            status: "error",
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (activeRoute === undefined) {
    throw new Error("Application routes are not configured.");
  }

  const handleCreateProject = async (title: string): Promise<void> => {
    if (loadState.status !== "loaded") {
      setProjectCreateState({
        message: "Workspace data must finish loading before creating projects.",
        status: "error",
      });
      return;
    }

    if (loadState.data.selectedWorkspaceId === null) {
      setProjectCreateState({
        message: "A visible workspace is required before creating projects.",
        status: "error",
      });
      return;
    }

    const configResult = parseWebShellConfig(webShellEnvironment);

    if (configResult.status === "missing_config") {
      setProjectCreateState({
        message: configResult.message,
        status: "error",
      });
      return;
    }

    setProjectCreateState({ status: "submitting" });

    try {
      const browserFetch: TaskApiFetch = async (url, init) => fetch(url, init);
      const createProject = createWebShellProjectCreator({
        config: configResult.config,
        fetch: browserFetch,
        target: {
          workspaceId: loadState.data.selectedWorkspaceId,
        },
      });
      const createdProject = await createProject({ title });

      setLoadState((currentState) => {
        if (currentState.status !== "loaded") {
          return currentState;
        }

        return {
          data: {
            ...currentState.data,
            projects: [createdProject, ...currentState.data.projects],
            selectedProjectId: createdProject.id,
            tasks: [],
          },
          status: "loaded",
        };
      });
      setProjectCreateState({
        message: `Created ${createdProject.title}.`,
        status: "success",
      });
      setTaskCreateState({ status: "idle" });
    } catch (error: unknown) {
      setProjectCreateState({
        message: readErrorMessage(error),
        status: "error",
      });
    }
  };

  const handleCreateTask = async (title: string): Promise<void> => {
    if (loadState.status !== "loaded") {
      setTaskCreateState({
        message: "Workspace data must finish loading before creating tasks.",
        status: "error",
      });
      return;
    }

    if (loadState.data.selectedWorkspaceId === null || loadState.data.selectedProjectId === null) {
      setTaskCreateState({
        message: "Create a workspace project before adding tasks.",
        status: "error",
      });
      return;
    }

    const configResult = parseWebShellConfig(webShellEnvironment);

    if (configResult.status === "missing_config") {
      setTaskCreateState({
        message: configResult.message,
        status: "error",
      });
      return;
    }

    setTaskCreateState({ status: "submitting" });

    try {
      const browserFetch: TaskApiFetch = async (url, init) => fetch(url, init);
      const createTask = createWebShellTaskCreator({
        config: configResult.config,
        fetch: browserFetch,
        target: {
          projectId: loadState.data.selectedProjectId,
          workspaceId: loadState.data.selectedWorkspaceId,
        },
      });
      const createdTask = await createTask({ title });

      setLoadState((currentState) => {
        if (currentState.status !== "loaded") {
          return currentState;
        }

        return {
          data: {
            ...currentState.data,
            tasks: [createdTask, ...currentState.data.tasks],
          },
          status: "loaded",
        };
      });
      setTaskCreateState({
        message: `Created ${createdTask.title}.`,
        status: "success",
      });
    } catch (error: unknown) {
      setTaskCreateState({
        message: readErrorMessage(error),
        status: "error",
      });
    }
  };

  return (
    <MBox as="main" className="app-shell">
      <MFlex
        as="aside"
        className="sidebar"
        direction="column"
        gap="xl"
        aria-label="Workspace navigation"
      >
        <MFlex className="brand-row" gap="m" wrap="nowrap">
          <MBox className="brand-mark" aria-hidden="true">
            t
          </MBox>
          <MFlex direction="column" gap="xs" align="start">
            <MText as="p" className="eyebrow" size="s" mode="inherit">
              Workspace
            </MText>
            <MHeading mode="h1">tAsk</MHeading>
          </MFlex>
        </MFlex>

        <MFlex as="nav" className="nav-list" direction="column" gap="xs" aria-label="Primary">
          {routes.map((route) => (
            <MButton
              className={route.id === activeRoute.id ? "nav-item is-active" : "nav-item"}
              key={route.id}
              onClick={() => setActiveRouteId(route.id)}
              before={<route.icon aria-hidden="true" className="nav-icon" />}
              title={route.description}
              mode="tertiary"
              justify="start"
            >
              {route.label}
            </MButton>
          ))}
        </MFlex>
      </MFlex>

      <MBox as="section" className="workspace">
        <MFlex as="header" className="topbar" gap="m" wrap="nowrap">
          <MButton
            aria-label="Toggle navigation"
            className="icon-button"
            mode="secondary"
            noPadding
          >
            <PanelLeft aria-hidden="true" />
          </MButton>
          <MInput
            aria-label="Search tasks and projects"
            before={<Search aria-hidden="true" />}
            className="command-bar-input"
            wrapperClassName="command-bar"
            placeholder="Search tasks, projects, skills"
          />
          <MButton before={<Command aria-hidden="true" />}>Ask agent</MButton>
        </MFlex>

        <MFlex
          as="section"
          className="route-header"
          align="start"
          justify="space-between"
          gap="xl"
          aria-labelledby="route-title"
        >
          <MFlex direction="column" gap="s" align="start">
            <MText as="p" className="eyebrow" size="s" mode="secondary">
              Current view
            </MText>
            <MHeading mode="h2" id="route-title">
              {activeRoute.label}
            </MHeading>
            <MText as="p" className="route-description" mode="secondary">
              {activeRoute.description}
            </MText>
          </MFlex>
          <MFlex
            className="status-strip"
            gap="s"
            justify="end"
            aria-label="Workspace status summary"
          >
            <MBadge mode="transparent">
              <MFlex gap="xs" wrap="nowrap">
                <ListTodo aria-hidden="true" />
                {data.tasks.length} tasks
              </MFlex>
            </MBadge>
            <MBadge mode="transparent">
              <MFlex gap="xs" wrap="nowrap">
                <FolderKanban aria-hidden="true" />
                {data.projects.length} projects
              </MFlex>
            </MBadge>
            <MBadge mode="transparent">
              <MFlex gap="xs" wrap="nowrap">
                <Sparkles aria-hidden="true" />
                {data.skills.length} skills
              </MFlex>
            </MBadge>
            <MBadge mode="transparent">
              <MFlex gap="xs" wrap="nowrap">
                <CalendarClock aria-hidden="true" />
                {dueSoonCount} due soon
              </MFlex>
            </MBadge>
          </MFlex>
        </MFlex>

        {loadState.status !== "loaded" ? <ShellStatePanel state={loadState} /> : null}
        {loadState.status === "loaded" && data.workspaces.length === 0 ? (
          <ShellStatePanel
            state={{
              message: "No visible workspaces were returned for this user.",
              status: "missing_config",
            }}
          />
        ) : null}

        <Suspense fallback={<MBox className="loading-state">Loading view</MBox>}>
          {activeRoute.id === "my-tasks" ? (
            <LazyDashboardView
              createProjectDisabled={!canCreateProject}
              createProjectState={projectCreateState}
              createTaskDisabled={!canCreateTask}
              createTaskState={taskCreateState}
              onCreateProject={handleCreateProject}
              onCreateTask={handleCreateTask}
              projects={data.projects}
              skills={data.skills}
              tasks={data.tasks}
            />
          ) : (
            <LazyWorkspaceView
              agentRuns={data.agentRuns}
              route={activeRoute}
              projects={data.projects}
              selectedProjectId={data.selectedProjectId}
              selectedWorkspaceId={data.selectedWorkspaceId}
              skills={data.skills}
              statuses={data.statuses}
              tasks={data.tasks}
              workspaces={data.workspaces}
            />
          )}
        </Suspense>
      </MBox>
    </MBox>
  );
}

function ShellStatePanel({
  state,
}: {
  state: Exclude<WebShellLoadState, { status: "loaded" }>;
}): ReactElement {
  const title =
    state.status === "loading"
      ? "Loading workspace data"
      : state.status === "error"
        ? "Workspace data failed"
        : "Workspace data unavailable";
  const message =
    state.status === "loading"
      ? "Reading workspaces, projects, tasks, and task skills."
      : state.message;

  return (
    <MCard className={`state-panel ${state.status}`} aria-live="polite" shadow={false}>
      <MHeading mode="h3">{title}</MHeading>
      <MText as="p" mode="secondary">
        {message}
      </MText>
    </MCard>
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Workspace data could not be loaded.";
}
