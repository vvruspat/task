import assert from "node:assert/strict";
import test from "node:test";
import type {
  AgentRunSummary,
  ArchiveProjectRequestInput,
  ArchiveTaskRequestInput,
  CreateProjectRequestInput,
  CreateTaskRequestInput,
  ProjectDetail,
  ProjectSummary,
  TaskApiClient,
  TaskDetail,
  TaskSkillSummary,
  TaskSummary,
  WorkspaceStatus,
  WorkspaceSummary,
} from "@task/api-client";
import {
  createWebShellProject,
  createWebShellTask,
  loadWebShellData,
  parseWebShellConfig,
} from "./web-shell-data.js";

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("parseWebShellConfig accepts required Vite environment values", () => {
  assert.deepEqual(
    parseWebShellConfig({
      VITE_TASK_API_BASE_URL: " https://task.example ",
      VITE_TASK_TRUSTED_USER_ID: " cccccccc-cccc-4ccc-8ccc-cccccccccccc ",
    }),
    {
      config: {
        apiBaseUrl: "https://task.example",
        trustedUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      },
      status: "configured",
    },
  );
});

test("parseWebShellConfig reports missing API base URL", () => {
  assert.deepEqual(parseWebShellConfig({ VITE_TASK_TRUSTED_USER_ID: "user-id" }), {
    message: "Set VITE_TASK_API_BASE_URL to load workspace data.",
    status: "missing_config",
  });
});

test("parseWebShellConfig reports missing trusted user id", () => {
  assert.deepEqual(parseWebShellConfig({ VITE_TASK_API_BASE_URL: "https://task.example" }), {
    message: "Set VITE_TASK_TRUSTED_USER_ID to load workspace data.",
    status: "missing_config",
  });
});

test("loadWebShellData loads workspace-scoped bootstrap data", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [agentRunSummary()],
    projects: [projectSummary()],
    skills: [taskSkillSummary()],
    statuses: [workspaceStatus()],
    tasks: [taskSummary()],
    workspaces: [workspaceSummary()],
  });

  assert.deepEqual(await loadWebShellData(client), {
    agentRuns: [agentRunSummary()],
    projects: [projectSummary()],
    selectedProjectId: projectId,
    selectedWorkspaceId: workspaceId,
    skills: [taskSkillSummary()],
    statuses: [workspaceStatus()],
    tasks: [taskSummary()],
    workspaces: [workspaceSummary()],
  });
  assert.deepEqual(client.calls, [
    "listWorkspaces",
    "listAgentRuns:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listProjects:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listTaskSkills:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listStatuses:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listTasks:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ]);
});

test("loadWebShellData handles empty workspace lists without scoped reads", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [],
    projects: [],
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [],
  });

  assert.deepEqual(await loadWebShellData(client), {
    agentRuns: [],
    projects: [],
    selectedProjectId: null,
    selectedWorkspaceId: null,
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [],
  });
  assert.deepEqual(client.calls, ["listWorkspaces"]);
});

test("loadWebShellData skips task reads when the workspace has no projects", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [agentRunSummary()],
    projects: [],
    skills: [taskSkillSummary()],
    statuses: [workspaceStatus()],
    tasks: [taskSummary()],
    workspaces: [workspaceSummary()],
  });

  assert.deepEqual(await loadWebShellData(client), {
    agentRuns: [agentRunSummary()],
    projects: [],
    selectedProjectId: null,
    selectedWorkspaceId: workspaceId,
    skills: [taskSkillSummary()],
    statuses: [workspaceStatus()],
    tasks: [],
    workspaces: [workspaceSummary()],
  });
  assert.deepEqual(client.calls, [
    "listWorkspaces",
    "listAgentRuns:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listProjects:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listTaskSkills:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "listStatuses:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  ]);
});

test("createWebShellTask posts trimmed task titles to the selected project", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [],
    projects: [projectSummary()],
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [workspaceSummary()],
  });

  assert.deepEqual(
    await createWebShellTask(
      client,
      {
        projectId,
        workspaceId,
      },
      {
        title: "  Intro  ",
      },
    ),
    taskSummary(),
  );
  assert.deepEqual(client.createTaskCalls, [
    {
      body: {
        title: "Intro",
      },
      projectId,
      workspaceId,
    },
  ]);
});

test("createWebShellProject posts trimmed project titles to the selected workspace", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [],
    projects: [],
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [workspaceSummary()],
  });

  assert.deepEqual(
    await createWebShellProject(
      client,
      {
        workspaceId,
      },
      {
        title: "  Album release  ",
      },
    ),
    projectSummary(),
  );
  assert.deepEqual(client.createProjectCalls, [
    {
      body: {
        title: "Album release",
      },
      workspaceId,
    },
  ]);
});

test("createWebShellTask rejects empty task titles without calling the client", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [],
    projects: [],
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [],
  });

  await assert.rejects(
    () =>
      createWebShellTask(
        client,
        {
          projectId,
          workspaceId,
        },
        {
          title: "   ",
        },
      ),
    {
      message: "Task title is required.",
    },
  );
  assert.deepEqual(client.createTaskCalls, []);
});

test("createWebShellProject rejects empty project titles without calling the client", async () => {
  const client = new RecordingTaskApiClient({
    agentRuns: [],
    projects: [],
    skills: [],
    statuses: [],
    tasks: [],
    workspaces: [],
  });

  await assert.rejects(
    () =>
      createWebShellProject(
        client,
        {
          workspaceId,
        },
        {
          title: "   ",
        },
      ),
    {
      message: "Project title is required.",
    },
  );
  assert.deepEqual(client.createProjectCalls, []);
});

type ApiData = {
  agentRuns: AgentRunSummary[];
  projects: ProjectSummary[];
  skills: TaskSkillSummary[];
  statuses: WorkspaceStatus[];
  tasks: TaskSummary[];
  workspaces: WorkspaceSummary[];
};

class RecordingTaskApiClient implements TaskApiClient {
  readonly calls: string[] = [];
  readonly createProjectCalls: CreateProjectRequestInput[] = [];
  readonly createTaskCalls: CreateTaskRequestInput[] = [];

  constructor(private readonly data: ApiData) {}

  async createProject(input: CreateProjectRequestInput): Promise<ProjectDetail> {
    this.createProjectCalls.push(input);
    return projectSummary();
  }

  async createTask(input: CreateTaskRequestInput): Promise<TaskDetail> {
    this.createTaskCalls.push(input);
    return taskSummary();
  }

  async archiveProject(_input: ArchiveProjectRequestInput): Promise<never> {
    throw new Error("archiveProject is not used by the web shell loader.");
  }

  async archiveTask(_input: ArchiveTaskRequestInput): Promise<never> {
    throw new Error("archiveTask is not used by the web shell loader.");
  }

  async getHealth(): Promise<never> {
    throw new Error("getHealth is not used by the web shell loader.");
  }

  async listAgentRuns(input: { workspaceId: string }): Promise<AgentRunSummary[]> {
    this.calls.push(`listAgentRuns:${input.workspaceId}`);
    return this.data.agentRuns;
  }

  async listProjects(input: { workspaceId: string }): Promise<ProjectSummary[]> {
    this.calls.push(`listProjects:${input.workspaceId}`);
    return this.data.projects;
  }

  async listStatuses(input: { workspaceId: string }): Promise<WorkspaceStatus[]> {
    this.calls.push(`listStatuses:${input.workspaceId}`);
    return this.data.statuses;
  }

  async listTaskSkills(input: { workspaceId: string }): Promise<TaskSkillSummary[]> {
    this.calls.push(`listTaskSkills:${input.workspaceId}`);
    return this.data.skills;
  }

  async listTasks(input: { projectId: string; workspaceId: string }): Promise<TaskSummary[]> {
    this.calls.push(`listTasks:${input.workspaceId}:${input.projectId}`);
    return this.data.tasks;
  }

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    this.calls.push("listWorkspaces");
    return this.data.workspaces;
  }
}

function workspaceSummary(): WorkspaceSummary {
  return {
    id: workspaceId,
    name: "Studio",
    slug: "studio",
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function agentRunSummary(): AgentRunSummary {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspaceId,
    userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    source: "web",
    sourceMessageId: null,
    model: "openai/gpt-5",
    inputText: "@task what is next for the album?",
    finalResponse: "Record the intro.",
    status: "completed",
    error: null,
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function projectSummary(): ProjectSummary {
  return {
    id: projectId,
    workspaceId,
    title: "Album release",
    description: null,
    status: "active",
    position: "1000",
    createdByUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskSummary(): TaskSummary {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    workspaceId,
    projectId,
    parentTaskId: null,
    title: "Intro",
    description: null,
    statusId: null,
    assigneeUserId: null,
    createdByUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    position: "1000",
    dueAt: null,
    sourceSkillId: null,
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function taskSkillSummary(): TaskSkillSummary {
  return {
    id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    workspaceId,
    name: "Song",
    description: null,
    aliases: ["track"],
    createdByUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    archivedAt: null,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}

function workspaceStatus(): WorkspaceStatus {
  return {
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    workspaceId,
    name: "In progress",
    color: "#3b82f6",
    position: "1000",
    isDone: false,
    createdAt: "2026-07-08T10:00:00.000Z",
    updatedAt: "2026-07-08T10:00:00.000Z",
  };
}
