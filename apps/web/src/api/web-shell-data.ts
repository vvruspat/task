import {
  type AgentRunSummary,
  createTaskApiClient,
  type ProjectDetail,
  type ProjectSummary,
  type TaskApiClient,
  type TaskApiFetch,
  type TaskDetail,
  type TaskSkillSummary,
  type TaskSummary,
  type WorkspaceStatus,
  type WorkspaceSummary,
} from "@task/api-client";

export type WebShellConfig = {
  apiBaseUrl: string;
  trustedUserId: string;
};

export type WebShellData = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  selectedProjectId: string | null;
  selectedWorkspaceId: string | null;
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

export type WebShellDataLoader = () => Promise<WebShellData>;

export type WebShellProjectCreator = (input: WebShellProjectCreateInput) => Promise<ProjectDetail>;

export type WebShellProjectCreateInput = {
  title: string;
};

export type WebShellProjectCreateTarget = {
  workspaceId: string;
};

export type WebShellTaskCreator = (input: WebShellTaskCreateInput) => Promise<TaskDetail>;

export type WebShellTaskCreateInput = {
  title: string;
};

export type WebShellTaskCreateTarget = {
  projectId: string;
  workspaceId: string;
};

export type WebShellConfigResult =
  | {
      config: WebShellConfig;
      status: "configured";
    }
  | {
      message: string;
      status: "missing_config";
    };

export type WebShellEnvironment = {
  VITE_TASK_API_BASE_URL?: string | undefined;
  VITE_TASK_TRUSTED_USER_ID?: string | undefined;
};

export function parseWebShellConfig(environment: WebShellEnvironment): WebShellConfigResult {
  const apiBaseUrl = environment.VITE_TASK_API_BASE_URL?.trim();
  const trustedUserId = environment.VITE_TASK_TRUSTED_USER_ID?.trim();

  if (apiBaseUrl === undefined || apiBaseUrl.length === 0) {
    return {
      message: "Set VITE_TASK_API_BASE_URL to load workspace data.",
      status: "missing_config",
    };
  }

  if (trustedUserId === undefined || trustedUserId.length === 0) {
    return {
      message: "Set VITE_TASK_TRUSTED_USER_ID to load workspace data.",
      status: "missing_config",
    };
  }

  return {
    config: {
      apiBaseUrl,
      trustedUserId,
    },
    status: "configured",
  };
}

export function createWebShellDataLoader(options: {
  config: WebShellConfig;
  fetch: TaskApiFetch;
}): WebShellDataLoader {
  const client = createTaskApiClient({
    baseUrl: options.config.apiBaseUrl,
    fetch: options.fetch,
    trustedUserId: options.config.trustedUserId,
  });

  return () => loadWebShellData(client);
}

export function createWebShellProjectCreator(options: {
  config: WebShellConfig;
  fetch: TaskApiFetch;
  target: WebShellProjectCreateTarget;
}): WebShellProjectCreator {
  const client = createTaskApiClient({
    baseUrl: options.config.apiBaseUrl,
    fetch: options.fetch,
    trustedUserId: options.config.trustedUserId,
  });

  return (input) => createWebShellProject(client, options.target, input);
}

export function createWebShellTaskCreator(options: {
  config: WebShellConfig;
  fetch: TaskApiFetch;
  target: WebShellTaskCreateTarget;
}): WebShellTaskCreator {
  const client = createTaskApiClient({
    baseUrl: options.config.apiBaseUrl,
    fetch: options.fetch,
    trustedUserId: options.config.trustedUserId,
  });

  return (input) => createWebShellTask(client, options.target, input);
}

export async function createWebShellProject(
  client: TaskApiClient,
  target: WebShellProjectCreateTarget,
  input: WebShellProjectCreateInput,
): Promise<ProjectDetail> {
  const title = input.title.trim();

  if (title.length === 0) {
    throw new Error("Project title is required.");
  }

  return client.createProject({
    body: {
      title,
    },
    workspaceId: target.workspaceId,
  });
}

export async function loadWebShellData(client: TaskApiClient): Promise<WebShellData> {
  const workspaces = await client.listWorkspaces();
  const selectedWorkspaceId = workspaces[0]?.id ?? null;

  if (selectedWorkspaceId === null) {
    return {
      agentRuns: [],
      projects: [],
      selectedProjectId: null,
      selectedWorkspaceId,
      skills: [],
      statuses: [],
      tasks: [],
      workspaces,
    };
  }

  const [agentRuns, projects, skills, statuses] = await Promise.all([
    client.listAgentRuns({ workspaceId: selectedWorkspaceId }),
    client.listProjects({ workspaceId: selectedWorkspaceId }),
    client.listTaskSkills({ workspaceId: selectedWorkspaceId }),
    client.listStatuses({ workspaceId: selectedWorkspaceId }),
  ]);
  const selectedProjectId = projects[0]?.id ?? null;
  const tasks =
    selectedProjectId === null
      ? []
      : await client.listTasks({
          projectId: selectedProjectId,
          workspaceId: selectedWorkspaceId,
        });

  return {
    agentRuns,
    projects,
    selectedProjectId,
    selectedWorkspaceId,
    skills,
    statuses,
    tasks,
    workspaces,
  };
}

export async function createWebShellTask(
  client: TaskApiClient,
  target: WebShellTaskCreateTarget,
  input: WebShellTaskCreateInput,
): Promise<TaskDetail> {
  const title = input.title.trim();

  if (title.length === 0) {
    throw new Error("Task title is required.");
  }

  return client.createTask({
    body: {
      title,
    },
    projectId: target.projectId,
    workspaceId: target.workspaceId,
  });
}
