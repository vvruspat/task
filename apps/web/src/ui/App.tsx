import {
  type ConfirmationRequestSummary,
  createTaskApiClient,
  type TaskApiFetch,
} from "@task/api-client";
import {
  Alert,
  AppHeader,
  AppShell,
  Badge,
  Button,
  Flex,
  Heading,
  Sidebar,
  Stack,
  Text,
  Toolbar,
} from "@task/ui/app";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Columns3,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  PanelLeft,
  Search,
  Settings,
  Sparkles,
  Table2,
} from "lucide-react";
import type { ComponentType, ReactElement, SetStateAction, SVGProps } from "react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  applyArchivedProjectToWebShellData,
  archiveWebShellProject,
  createWebShellDataLoader,
  createWebShellProjectCreator,
  createWebShellTaskCreator,
  loadWebShellProjectTasks,
  parseWebShellConfig,
  updateWebShellProject,
  type WebShellData,
  type WebShellEnvironment,
} from "../api/web-shell-data.js";
import { GlobalSearchPalette } from "./GlobalSearchPalette.js";
import { isWorkspaceSearchShortcut } from "./globalSearchPaletteModels.js";
import {
  createWorkspaceNavigationUrl,
  parseWorkspaceNavigation,
  type WorkspaceRouteId,
} from "./navigation.js";
import { canLeaveTaskWithDraft } from "./taskNavigationGuard.js";
import type { ConfirmationActionState, ConfirmationLoadState } from "./views/ConfirmationsView.js";

const LazyDashboardView = lazy(() => import("./views/DashboardView.js"));
const LazyConfirmationsView = lazy(() => import("./views/ConfirmationsView.js"));
const LazyWorkspaceView = lazy(() => import("./views/WorkspaceView.js"));

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type AppRoute = {
  [RouteId in WorkspaceRouteId]: {
    id: RouteId;
    label: string;
    description: string;
    icon: IconComponent;
  };
}[WorkspaceRouteId];

type WorkspaceNavigationUpdate = SetStateAction<{
  projectId: string | null;
  routeId: WorkspaceRouteId;
  taskId: string | null;
}>;

const routes: AppRoute[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Workspace overview, priorities, and quick actions.",
    icon: LayoutDashboard,
  },
  {
    id: "confirmations",
    label: "Confirmations",
    description: "Actions waiting for an explicit approval.",
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
  const [navigationState, setNavigationState] = useState(() =>
    parseWorkspaceNavigation(window.location.search),
  );
  const navigationStateRef = useRef(navigationState);
  const [projectCreateState, setProjectCreateState] = useState<FormSubmissionState>({
    status: "idle",
  });
  const [taskCreateState, setTaskCreateState] = useState<FormSubmissionState>({ status: "idle" });
  const [taskDrawerDirty, setTaskDrawerDirty] = useState(false);
  const [isSearchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const [confirmationLoadState, setConfirmationLoadState] = useState<ConfirmationLoadState>({
    status: "loading",
  });
  const [confirmationActionState, setConfirmationActionState] = useState<ConfirmationActionState>({
    status: "idle",
  });
  const [confirmationRequests, setConfirmationRequests] = useState<ConfirmationRequestSummary[]>(
    [],
  );
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
  const activeRoute = useMemo(() => {
    const route = routes.find((candidate) => candidate.id === navigationState.routeId);
    if (route === undefined) {
      throw new Error("Application routes are not configured.");
    }
    return route;
  }, [navigationState.routeId]);
  const data = loadState.status === "loaded" ? loadState.data : emptyWebShellData;
  const selectedProjectId =
    navigationState.projectId !== null &&
    data.projects.some((project) => project.id === navigationState.projectId)
      ? navigationState.projectId
      : data.selectedProjectId;
  const dueSoonCount = data.tasks.filter((task) => task.dueAt !== null).length;
  const canCreateProject = loadState.status === "loaded" && data.selectedWorkspaceId !== null;
  const canCreateTask =
    loadState.status === "loaded" &&
    data.selectedWorkspaceId !== null &&
    selectedProjectId !== null;
  const taskClient = useMemo(() => {
    const configResult = parseWebShellConfig(webShellEnvironment);
    return configResult.status === "configured"
      ? createTaskApiClient({
          baseUrl: configResult.config.apiBaseUrl,
          fetch: async (url, init) => fetch(url, init),
          trustedUserId: configResult.config.trustedUserId,
        })
      : null;
  }, []);
  const trustedUserId = useMemo(() => {
    const configResult = parseWebShellConfig(webShellEnvironment);
    return configResult.status === "configured" ? configResult.config.trustedUserId : null;
  }, []);

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

  useEffect(() => {
    if (data.selectedWorkspaceId === null) {
      setConfirmationRequests([]);
      setConfirmationLoadState({ status: "loaded" });
      return;
    }

    const configResult = parseWebShellConfig(webShellEnvironment);
    if (configResult.status === "missing_config") {
      setConfirmationLoadState({ message: configResult.message, status: "error" });
      return;
    }

    let isCurrent = true;
    const client = createTaskApiClient({
      baseUrl: configResult.config.apiBaseUrl,
      fetch: async (url, init) => fetch(url, init),
      trustedUserId: configResult.config.trustedUserId,
    });
    setConfirmationLoadState({ status: "loading" });
    void client
      .listPendingConfirmationRequests({ workspaceId: data.selectedWorkspaceId })
      .then((requests) => {
        if (isCurrent) {
          setConfirmationRequests(requests);
          setConfirmationLoadState({ status: "loaded" });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setConfirmationLoadState({ message: readErrorMessage(error), status: "error" });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [data.selectedWorkspaceId]);

  useEffect(() => {
    const handlePopState = (): void => {
      const nextState = parseWorkspaceNavigation(window.location.search);
      if (
        !canLeaveTaskWithDraft(navigationStateRef.current, nextState, taskDrawerDirty, () =>
          window.confirm("Discard unsaved task changes?"),
        )
      ) {
        window.history.pushState(
          null,
          "",
          createWorkspaceNavigationUrl(window.location, navigationStateRef.current),
        );
        return;
      }
      navigationStateRef.current = nextState;
      setNavigationState(nextState);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [taskDrawerDirty]);

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent): void => {
      if (isWorkspaceSearchShortcut(event)) {
        event.preventDefault();
        setSearchPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  useEffect(() => {
    if (
      loadState.status !== "loaded" ||
      data.selectedWorkspaceId === null ||
      selectedProjectId === null
    ) {
      return;
    }
    const configResult = parseWebShellConfig(webShellEnvironment);
    if (configResult.status === "missing_config") return;
    let isCurrent = true;
    const client = createTaskApiClient({
      baseUrl: configResult.config.apiBaseUrl,
      fetch: async (url, init) => fetch(url, init),
      trustedUserId: configResult.config.trustedUserId,
    });
    void loadWebShellProjectTasks(client, {
      projectId: selectedProjectId,
      workspaceId: data.selectedWorkspaceId,
    })
      .then((tasks) => {
        if (isCurrent) {
          setLoadState((currentState) =>
            currentState.status === "loaded"
              ? { data: { ...currentState.data, tasks }, status: "loaded" }
              : currentState,
          );
        }
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [data.selectedWorkspaceId, loadState.status, selectedProjectId]);

  const updateNavigation = (nextState: WorkspaceNavigationUpdate): void => {
    const resolvedState =
      typeof nextState === "function" ? nextState(navigationStateRef.current) : nextState;
    if (
      !canLeaveTaskWithDraft(navigationStateRef.current, resolvedState, taskDrawerDirty, () =>
        window.confirm("Discard unsaved task changes?"),
      )
    )
      return;
    setTaskDrawerDirty(false);
    navigationStateRef.current = resolvedState;
    window.history.pushState(
      null,
      "",
      createWorkspaceNavigationUrl(window.location, resolvedState),
    );
    setNavigationState(resolvedState);
  };

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
      updateNavigation((currentNavigation) => ({
        ...currentNavigation,
        projectId: createdProject.id,
      }));
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

  const handleCreateTask = async (
    title: string,
    targetProjectId: string | null = selectedProjectId,
  ): Promise<void> => {
    if (loadState.status !== "loaded") {
      setTaskCreateState({
        message: "Workspace data must finish loading before creating tasks.",
        status: "error",
      });
      return;
    }

    if (loadState.data.selectedWorkspaceId === null || targetProjectId === null) {
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
          projectId: targetProjectId,
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

  const handleUpdateProject = async (
    projectId: string,
    input: { description: string | null; title: string },
  ): Promise<void> => {
    if (loadState.status !== "loaded" || loadState.data.selectedWorkspaceId === null) {
      throw new Error("A visible workspace is required before updating projects.");
    }
    const configResult = parseWebShellConfig(webShellEnvironment);
    if (configResult.status === "missing_config") throw new Error(configResult.message);
    const client = createTaskApiClient({
      baseUrl: configResult.config.apiBaseUrl,
      fetch: async (url, init) => fetch(url, init),
      trustedUserId: configResult.config.trustedUserId,
    });
    const updatedProject = await updateWebShellProject(
      client,
      { projectId, workspaceId: loadState.data.selectedWorkspaceId },
      input,
    );
    setLoadState((currentState) =>
      currentState.status === "loaded"
        ? {
            data: {
              ...currentState.data,
              projects: currentState.data.projects.map((project) =>
                project.id === updatedProject.id ? updatedProject : project,
              ),
            },
            status: "loaded",
          }
        : currentState,
    );
  };

  const handleArchiveProject = async (projectId: string): Promise<void> => {
    if (loadState.status !== "loaded" || loadState.data.selectedWorkspaceId === null) {
      throw new Error("A visible workspace is required before archiving projects.");
    }
    const configResult = parseWebShellConfig(webShellEnvironment);
    if (configResult.status === "missing_config") throw new Error(configResult.message);
    const client = createTaskApiClient({
      baseUrl: configResult.config.apiBaseUrl,
      fetch: async (url, init) => fetch(url, init),
      trustedUserId: configResult.config.trustedUserId,
    });
    const archivedProject = await archiveWebShellProject(client, {
      projectId,
      workspaceId: loadState.data.selectedWorkspaceId,
    });
    let nextProjectId: string | null = null;
    setLoadState((currentState) => {
      if (currentState.status !== "loaded") return currentState;
      const data = applyArchivedProjectToWebShellData(
        currentState.data,
        archivedProject,
        selectedProjectId,
      );
      nextProjectId = data.selectedProjectId;
      return { data, status: "loaded" };
    });
    if (selectedProjectId === projectId) {
      updateNavigation((currentNavigation) => ({ ...currentNavigation, projectId: nextProjectId }));
    }
  };

  const resolveConfirmation = async (
    confirmationRequestId: string,
    action: "cancel" | "confirm",
  ): Promise<void> => {
    if (data.selectedWorkspaceId === null) {
      setConfirmationActionState({
        message: "A visible workspace is required to resolve confirmations.",
        status: "error",
      });
      return;
    }

    const configResult = parseWebShellConfig(webShellEnvironment);
    if (configResult.status === "missing_config") {
      setConfirmationActionState({ message: configResult.message, status: "error" });
      return;
    }

    setConfirmationActionState({
      confirmationRequestId,
      status: action === "confirm" ? "confirming" : "cancelling",
    });
    try {
      const client = createTaskApiClient({
        baseUrl: configResult.config.apiBaseUrl,
        fetch: async (url, init) => fetch(url, init),
        trustedUserId: configResult.config.trustedUserId,
      });
      const input = { confirmationRequestId, workspaceId: data.selectedWorkspaceId };
      if (action === "confirm") {
        await client.confirmConfirmationRequest(input);
      } else {
        await client.cancelConfirmationRequest(input);
      }
      setConfirmationRequests((requests) =>
        requests.filter((request) => request.id !== confirmationRequestId),
      );
      setConfirmationActionState({ status: "idle" });
    } catch (error: unknown) {
      setConfirmationActionState({ message: readErrorMessage(error), status: "error" });
    }
  };

  return (
    <AppShell
      sidebar={
        <Sidebar aria-label="Workspace navigation">
          <Stack align="start" gap="xs">
            <Badge aria-label="tAsk" tone="accent">
              t
            </Badge>
            <Text tone="muted">Workspace</Text>
            <Heading level={1}>tAsk</Heading>
          </Stack>

          <Stack align="stretch" gap="xs" role="navigation" aria-label="Primary">
            {routes.map((route) => (
              <Button
                key={route.id}
                onClick={() =>
                  updateNavigation((currentState) => ({ ...currentState, routeId: route.id }))
                }
                title={route.description}
                variant={route.id === activeRoute.id ? "secondary" : "ghost"}
              >
                <route.icon aria-hidden="true" />
                {route.label}
              </Button>
            ))}
          </Stack>
        </Sidebar>
      }
      header={
        <AppHeader>
          <Toolbar>
            <Button aria-label="Toggle navigation" size="sm" variant="ghost">
              <PanelLeft aria-hidden="true" />
            </Button>
            <Button
              aria-haspopup="dialog"
              aria-label="Search workspace. Press Command or Control K."
              onClick={() => setSearchPaletteOpen(true)}
              variant="secondary"
            >
              <Search aria-hidden="true" />
              Search tasks, projects, skills
            </Button>
          </Toolbar>
        </AppHeader>
      }
    >
      <Stack align="stretch" gap="xl">
        <Flex align="start" gap="xl" justify="between" aria-labelledby="route-title">
          <Stack align="start" gap="sm">
            <Text tone="muted">Current view</Text>
            <Heading id="route-title" level={2}>
              {activeRoute.label}
            </Heading>
            <Text tone="muted">{activeRoute.description}</Text>
          </Stack>
          <Flex align="center" gap="sm" aria-label="Workspace status summary">
            <Badge tone="neutral">
              <ListTodo aria-hidden="true" /> {data.tasks.length} tasks
            </Badge>
            <Badge tone="neutral">
              <FolderKanban aria-hidden="true" /> {data.projects.length} projects
            </Badge>
            <Badge tone="neutral">
              <Sparkles aria-hidden="true" /> {data.skills.length} skills
            </Badge>
            <Badge tone="neutral">
              <CalendarClock aria-hidden="true" /> {dueSoonCount} due soon
            </Badge>
          </Flex>
        </Flex>

        {loadState.status !== "loaded" ? <ShellStatePanel state={loadState} /> : null}
        {loadState.status === "loaded" && data.workspaces.length === 0 ? (
          <ShellStatePanel
            state={{
              message: "No visible workspaces were returned for this user.",
              status: "missing_config",
            }}
          />
        ) : null}

        <Suspense fallback={<Text tone="muted">Loading view</Text>}>
          {activeRoute.id === "dashboard" ? (
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
          ) : activeRoute.id === "confirmations" ? (
            <LazyConfirmationsView
              actionState={confirmationActionState}
              confirmationRequests={confirmationRequests}
              loadState={confirmationLoadState}
              onCancel={(confirmationRequestId) =>
                resolveConfirmation(confirmationRequestId, "cancel")
              }
              onConfirm={(confirmationRequestId) =>
                resolveConfirmation(confirmationRequestId, "confirm")
              }
            />
          ) : (
            <LazyWorkspaceView
              agentRuns={data.agentRuns}
              onArchiveProject={handleArchiveProject}
              onCreateProject={handleCreateProject}
              onCreateTask={(projectId, title) => handleCreateTask(title, projectId)}
              onCloseTask={() =>
                updateNavigation((currentNavigation) => ({ ...currentNavigation, taskId: null }))
              }
              onOpenTask={(taskId) =>
                updateNavigation((currentNavigation) => ({ ...currentNavigation, taskId }))
              }
              onOpenConfirmations={() =>
                updateNavigation((currentNavigation) => ({
                  ...currentNavigation,
                  routeId: "confirmations",
                  taskId: null,
                }))
              }
              onSelectProject={(projectId) =>
                updateNavigation((currentNavigation) => ({
                  ...currentNavigation,
                  projectId,
                  routeId: "projects",
                }))
              }
              onUpdateProject={handleUpdateProject}
              onTaskUpdated={(updatedTask) =>
                setLoadState((currentState) =>
                  currentState.status === "loaded"
                    ? {
                        data: {
                          ...currentState.data,
                          tasks: currentState.data.tasks.map((task) =>
                            task.id === updatedTask.id ? updatedTask : task,
                          ),
                        },
                        status: "loaded",
                      }
                    : currentState,
                )
              }
              onTaskDirtyChange={setTaskDrawerDirty}
              projectActionState={projectCreateState}
              route={activeRoute}
              projects={data.projects}
              selectedProjectId={selectedProjectId}
              selectedTaskId={navigationState.taskId}
              selectedWorkspaceId={data.selectedWorkspaceId}
              skills={data.skills}
              statuses={data.statuses}
              taskActionState={taskCreateState}
              tasks={data.tasks}
              taskClient={taskClient}
              currentUserId={trustedUserId}
              workspaces={data.workspaces}
            />
          )}
        </Suspense>
        {navigationState.taskId !== null &&
        (activeRoute.id === "dashboard" || activeRoute.id === "confirmations") ? (
          <Alert role="alert" tone="danger">
            <Text>
              Task details can only be opened from a workspace task view. Clear this unavailable
              task link to continue.
            </Text>
            <Button
              onClick={() =>
                updateNavigation((currentNavigation) => ({ ...currentNavigation, taskId: null }))
              }
              variant="danger"
            >
              Clear task link
            </Button>
          </Alert>
        ) : null}
      </Stack>
      <GlobalSearchPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setSearchPaletteOpen(false)}
        onNavigate={updateNavigation}
        searchClient={taskClient}
        workspaceId={data.selectedWorkspaceId}
      />
    </AppShell>
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
    <Alert
      tone={
        state.status === "error" ? "danger" : state.status === "missing_config" ? "warning" : "info"
      }
    >
      <Heading level={3}>{title}</Heading>
      <Text tone="muted">{message}</Text>
    </Alert>
  );
}

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Workspace data could not be loaded.";
}
