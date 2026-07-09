import type { TaskApiFetch } from "@task/api-client";
import { Badge, Box, Button, Heading, IconButton, Inline, Stack, Surface, Text } from "@task/ui";
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
    <Box as="main" className="app-shell">
      <Stack as="aside" className="sidebar" gap="xl" aria-label="Workspace navigation">
        <Inline className="brand-row" gap="md" wrap="nowrap">
          <Box className="brand-mark" aria-hidden="true">
            t
          </Box>
          <Stack gap="xs">
            <Text className="eyebrow" size="sm" tone="inverse" weight="strong">
              Workspace
            </Text>
            <Heading as="h1" size="md" tone="inverse">
              tAsk
            </Heading>
          </Stack>
        </Inline>

        <Stack as="nav" className="nav-list" gap="xs" aria-label="Primary">
          {routes.map((route) => (
            <Button
              className={route.id === activeRoute.id ? "nav-item is-active" : "nav-item"}
              key={route.id}
              onClick={() => setActiveRouteId(route.id)}
              before={<route.icon aria-hidden="true" className="nav-icon" />}
              title={route.description}
              variant="ghost"
            >
              <span>{route.label}</span>
            </Button>
          ))}
        </Stack>
      </Stack>

      <Box as="section" className="workspace">
        <Inline as="header" className="topbar" gap="md" wrap="nowrap">
          <IconButton label="Toggle navigation">
            <PanelLeft aria-hidden="true" />
          </IconButton>
          <Inline as="label" className="command-bar" gap="md" wrap="nowrap">
            <Search aria-hidden="true" />
            <input
              aria-label="Search tasks and projects"
              placeholder="Search tasks, projects, skills"
            />
          </Inline>
          <Button before={<Command aria-hidden="true" />}>Ask agent</Button>
        </Inline>

        <Inline
          as="section"
          className="route-header"
          align="start"
          justify="space-between"
          gap="xl"
          aria-labelledby="route-title"
        >
          <Stack gap="sm">
            <Text className="eyebrow" size="sm" tone="muted" weight="strong">
              Current view
            </Text>
            <Heading as="h2" id="route-title" size="lg">
              {activeRoute.label}
            </Heading>
            <Text className="route-description" tone="muted">
              {activeRoute.description}
            </Text>
          </Stack>
          <Inline
            as="ul"
            className="status-strip"
            gap="sm"
            justify="end"
            aria-label="Workspace status summary"
          >
            <Badge as="li" before={<ListTodo aria-hidden="true" />}>
              {data.tasks.length} tasks
            </Badge>
            <Badge as="li" before={<FolderKanban aria-hidden="true" />}>
              {data.projects.length} projects
            </Badge>
            <Badge as="li" before={<Sparkles aria-hidden="true" />}>
              {data.skills.length} skills
            </Badge>
            <Badge as="li" before={<CalendarClock aria-hidden="true" />}>
              {dueSoonCount} due soon
            </Badge>
          </Inline>
        </Inline>

        {loadState.status !== "loaded" ? <ShellStatePanel state={loadState} /> : null}
        {loadState.status === "loaded" && data.workspaces.length === 0 ? (
          <ShellStatePanel
            state={{
              message: "No visible workspaces were returned for this user.",
              status: "missing_config",
            }}
          />
        ) : null}

        <Suspense fallback={<Box className="loading-state">Loading view</Box>}>
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
      </Box>
    </Box>
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
    <Surface
      as="section"
      className={`state-panel ${state.status}`}
      tone={state.status === "error" ? "warning" : "default"}
      aria-live="polite"
    >
      <Heading as="h3" size="sm">
        {title}
      </Heading>
      <Text tone="muted">{message}</Text>
    </Surface>
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Workspace data could not be loaded.";
}
