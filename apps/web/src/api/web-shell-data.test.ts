import assert from "node:assert/strict";
import test from "node:test";
import type {
  AddTaskSubtasksRequestInput,
  AgentRunSummary,
  ApplyTaskSkillRequestInput,
  ArchiveProjectRequestInput,
  ArchiveTaskRequestInput,
  BulkUpdateTasksRequestInput,
  CloneTaskSkillRequestInput,
  ConfirmationRequestDetail,
  ConfirmationRequestScopedInput,
  ConfirmationRequestSummary,
  CreateProjectRequestInput,
  CreateTaskCommentRequestInput,
  CreateTaskFileAttachmentRequestInput,
  CreateTaskLinkAttachmentRequestInput,
  CreateTaskRequestInput,
  CreateTaskSkillRequestInput,
  CreateTaskTelegramFileAttachmentRequestInput,
  DashboardOverview,
  GetProjectMatrixRequestInput,
  ListMyTasksRequestInput,
  ListTaskTableRequestInput,
  MoveTaskRequestInput,
  MyTasksPage,
  PreviewTaskSkillApplyRequestInput,
  ProjectDetail,
  ProjectMatrix,
  ProjectSummary,
  TaskActivityEvent,
  TaskApiClient,
  TaskAttachment,
  TaskComment,
  TaskDetail,
  TaskSkillScopedInput,
  TaskSkillSummary,
  TaskSummary,
  TaskTablePage,
  UpdateProjectRequestInput,
  UpdateTaskAssigneeRequestInput,
  UpdateTaskDueDateRequestInput,
  UpdateTaskRequestInput,
  UpdateTaskSkillDefinitionRequestInput,
  UpdateTaskSkillMetadataRequestInput,
  UpdateTaskStatusRequestInput,
  WorkspaceStatus,
  WorkspaceSummary,
} from "@task/api-client";
import {
  applyArchivedProjectToWebShellData,
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

test("applyArchivedProjectToWebShellData clears deep-linked project tasks and selects the next active project", () => {
  const deepLinkedProjectId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const nextProjectId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const result = applyArchivedProjectToWebShellData(
    {
      agentRuns: [],
      projects: [
        projectSummary({ id: projectId, title: "Default" }),
        projectSummary({ id: deepLinkedProjectId, title: "Deep link" }),
        projectSummary({ id: nextProjectId, title: "Next" }),
      ],
      selectedProjectId: projectId,
      selectedWorkspaceId: workspaceId,
      skills: [],
      statuses: [],
      tasks: [taskSummary({ projectId: deepLinkedProjectId })],
      workspaces: [workspaceSummary()],
    },
    projectSummary({ archivedAt: "2026-07-10T10:00:00.000Z", id: deepLinkedProjectId }),
    deepLinkedProjectId,
  );

  assert.equal(result.selectedProjectId, projectId);
  assert.deepEqual(result.tasks, []);
  assert.equal(
    result.projects.find((project) => project.id === deepLinkedProjectId)?.archivedAt,
    "2026-07-10T10:00:00.000Z",
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

  async createTaskSkill(_input: CreateTaskSkillRequestInput): Promise<never> {
    throw new Error("createTaskSkill is not used by the web shell loader.");
  }

  async cloneTaskSkill(_input: CloneTaskSkillRequestInput): Promise<never> {
    throw new Error("cloneTaskSkill is not used by the web shell loader.");
  }

  async createTaskComment(_input: CreateTaskCommentRequestInput): Promise<never> {
    throw new Error("createTaskComment is not used by the web shell loader.");
  }

  async createTaskFileAttachment(_input: CreateTaskFileAttachmentRequestInput): Promise<never> {
    throw new Error("createTaskFileAttachment is not used by the web shell loader.");
  }

  async createTaskLinkAttachment(_input: CreateTaskLinkAttachmentRequestInput): Promise<never> {
    throw new Error("createTaskLinkAttachment is not used by the web shell loader.");
  }

  async createTaskTelegramFileAttachment(
    _input: CreateTaskTelegramFileAttachmentRequestInput,
  ): Promise<never> {
    throw new Error("createTaskTelegramFileAttachment is not used by the web shell loader.");
  }

  async archiveProject(_input: ArchiveProjectRequestInput): Promise<never> {
    throw new Error("archiveProject is not used by the web shell loader.");
  }

  async archiveTask(_input: ArchiveTaskRequestInput): Promise<never> {
    throw new Error("archiveTask is not used by the web shell loader.");
  }

  async addTaskSubtasks(_input: AddTaskSubtasksRequestInput): Promise<never> {
    throw new Error("addTaskSubtasks is not used by the web shell loader.");
  }

  async getTask(_input: ArchiveTaskRequestInput): Promise<never> {
    throw new Error("getTask is not used by the web shell loader.");
  }

  async getTaskSkill(_input: TaskSkillScopedInput): Promise<never> {
    throw new Error("getTaskSkill is not used by the web shell loader.");
  }

  async archiveTaskSkill(_input: TaskSkillScopedInput): Promise<never> {
    throw new Error("archiveTaskSkill is not used by the web shell loader.");
  }

  async updateTaskSkillMetadata(_input: UpdateTaskSkillMetadataRequestInput): Promise<never> {
    throw new Error("updateTaskSkillMetadata is not used by the web shell loader.");
  }

  async updateTaskSkillDefinition(_input: UpdateTaskSkillDefinitionRequestInput): Promise<never> {
    throw new Error("updateTaskSkillDefinition is not used by the web shell loader.");
  }

  async previewTaskSkillApply(_input: PreviewTaskSkillApplyRequestInput): Promise<never> {
    throw new Error("previewTaskSkillApply is not used by the web shell loader.");
  }

  async applyTaskSkill(_input: ApplyTaskSkillRequestInput): Promise<never> {
    throw new Error("applyTaskSkill is not used by the web shell loader.");
  }

  async updateProject(_input: UpdateProjectRequestInput): Promise<never> {
    throw new Error("updateProject is not used by the web shell loader.");
  }

  async updateTask(_input: UpdateTaskRequestInput): Promise<never> {
    throw new Error("updateTask is not used by the web shell loader.");
  }

  async getHealth(): Promise<never> {
    throw new Error("getHealth is not used by the web shell loader.");
  }

  async getDashboardOverview(_input: { workspaceId: string }): Promise<DashboardOverview> {
    throw new Error("getDashboardOverview is not used by the web shell loader.");
  }

  async getProjectMatrix(_input: GetProjectMatrixRequestInput): Promise<ProjectMatrix> {
    throw new Error("getProjectMatrix is not used by the web shell loader.");
  }

  async listPendingConfirmationRequests(_input: {
    workspaceId: string;
  }): Promise<ConfirmationRequestSummary[]> {
    throw new Error("listPendingConfirmationRequests is not used by the web shell loader.");
  }

  async confirmConfirmationRequest(
    _input: ConfirmationRequestScopedInput,
  ): Promise<ConfirmationRequestDetail> {
    throw new Error("confirmConfirmationRequest is not used by the web shell loader.");
  }

  async cancelConfirmationRequest(
    _input: ConfirmationRequestScopedInput,
  ): Promise<ConfirmationRequestDetail> {
    throw new Error("cancelConfirmationRequest is not used by the web shell loader.");
  }

  async listMyTasks(_input: ListMyTasksRequestInput): Promise<MyTasksPage> {
    throw new Error("listMyTasks is not used by the web shell loader.");
  }

  async listTaskTable(_input: ListTaskTableRequestInput): Promise<TaskTablePage> {
    throw new Error("listTaskTable is not used by the web shell loader.");
  }

  async listAgentRuns(input: { workspaceId: string }): Promise<AgentRunSummary[]> {
    this.calls.push(`listAgentRuns:${input.workspaceId}`);
    return this.data.agentRuns;
  }

  async listTaskAttachments(_input: {
    projectId: string;
    taskId: string;
    workspaceId: string;
  }): Promise<TaskAttachment[]> {
    throw new Error("listTaskAttachments is not used by the web shell loader.");
  }

  async listTaskActivity(_input: ArchiveTaskRequestInput): Promise<TaskActivityEvent[]> {
    throw new Error("listTaskActivity is not used by the web shell loader.");
  }

  async listTaskComments(_input: {
    projectId: string;
    taskId: string;
    workspaceId: string;
  }): Promise<TaskComment[]> {
    throw new Error("listTaskComments is not used by the web shell loader.");
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

  async moveTask(_input: MoveTaskRequestInput): Promise<never> {
    throw new Error("moveTask is not used by the web shell loader.");
  }

  async updateTaskAssignee(_input: UpdateTaskAssigneeRequestInput): Promise<never> {
    throw new Error("updateTaskAssignee is not used by the web shell loader.");
  }

  async updateTaskDueDate(_input: UpdateTaskDueDateRequestInput): Promise<never> {
    throw new Error("updateTaskDueDate is not used by the web shell loader.");
  }

  async updateTaskStatus(_input: UpdateTaskStatusRequestInput): Promise<never> {
    throw new Error("updateTaskStatus is not used by the web shell loader.");
  }

  async bulkUpdateTasks(_input: BulkUpdateTasksRequestInput): Promise<never> {
    throw new Error("bulkUpdateTasks is not used by the web shell loader.");
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

function projectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
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
    ...overrides,
  };
}

function taskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
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
    ...overrides,
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
