import assert from "node:assert/strict";
import test from "node:test";
import type { IntegrationAgentToolDefinition } from "@task/integration-sdk";
import { ProjectDetailDto } from "../projects/projects.dto.js";
import type { TaskSkillSummary } from "../task-skills/task-skills.contracts.js";
import {
  TaskSkillApplyResultDto,
  TaskSkillDetailDto,
  TaskSkillSummaryDto,
} from "../task-skills/task-skills.dto.js";
import type { TaskSkillsService } from "../task-skills/task-skills.service.js";
import { TaskDetailDto } from "../tasks/tasks.dto.js";
import { WorkspaceDetailDto } from "../workspaces/workspaces.dto.js";
import {
  BackendAgentToolOperationDispatcher,
  findMatchingTaskSkills,
  findMatchingWorkspaceMembers,
} from "./backend-agent-tool-dispatcher.js";

const workspaceId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const projectId = "44444444-4444-4444-8444-444444444444";
const taskId = "55555555-5555-4555-8555-555555555555";
const taskSkillId = "77777777-7777-4777-8777-777777777777";
const marinaUserId = "88888888-8888-4888-8888-888888888888";
const now = new Date("2026-07-18T09:00:00.000Z");

test("BackendAgentToolOperationDispatcher creates a reusable task template", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task call.");
      },
    },
    taskSkillsService({
      skills: [],
      onCreate(actualWorkspaceId, actualUserId, input) {
        calls.push({ actualWorkspaceId, actualUserId, input });
      },
    }),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-skill-create",
      toolName: "task_skill_create",
      arguments: {
        name: "Песня",
        aliases: ["трек"],
        subtasks: [
          { title: "Написать аранжировку", labels: ["production"] },
          { title: "Записать вокал" },
        ],
      },
    },
    { workspaceId, userId },
  );

  assert.deepEqual(result.result, {
    kind: "task_skill_created",
    id: taskSkillId,
    name: "Песня",
    workspaceId,
    subtaskCount: 2,
    subtasks: [{ title: "Написать аранжировку" }, { title: "Записать вокал" }],
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualUserId: userId,
      input: {
        name: "Песня",
        aliases: ["трек"],
        definition: {
          subtasks: [
            { title: "Написать аранжировку", labels: ["production"] },
            { title: "Записать вокал" },
          ],
        },
      },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher routes workspace integration tools", async () => {
  const calls: unknown[] = [];
  const definitions: readonly IntegrationAgentToolDefinition[] = [
    {
      description: "Search Drive files.",
      inputSchema: {
        additionalProperties: false,
        properties: { query: { type: "string" } },
        required: ["query"],
        type: "object",
      },
      name: "gdrive_search",
      readOnly: true,
    },
  ];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task call.");
      },
    },
    emptyTaskSkillsService(),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      async listTools(actualWorkspaceId, actualUserId) {
        calls.push({ actualUserId, actualWorkspaceId, kind: "list" });
        return definitions;
      },
      async executeTool(call, actualWorkspaceId, actualUserId) {
        calls.push({ actualUserId, actualWorkspaceId, call, kind: "execute" });
        return { files: [], kind: "google_drive_search_results" };
      },
    },
  );
  const context = { workspaceId, userId };

  assert.deepEqual(await dispatcher.listToolDefinitions(context), definitions);
  const result = await dispatcher.dispatchToolCall(
    {
      arguments: { query: "brief" },
      callId: "call-drive-search",
      toolName: "gdrive_search",
    },
    context,
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, { files: [], kind: "google_drive_search_results" });
  assert.deepEqual(calls, [
    { actualUserId: userId, actualWorkspaceId: workspaceId, kind: "list" },
    {
      actualUserId: userId,
      actualWorkspaceId: workspaceId,
      call: { arguments: { query: "brief" }, name: "gdrive_search" },
      kind: "execute",
    },
  ]);
});

test("BackendAgentToolOperationDispatcher exposes permission-checked project and task reads", async () => {
  const realtimeChanges: unknown[] = [];
  const project = new ProjectDetailDto({
    id: projectId,
    workspaceId,
    key: "ALB",
    slug: "album",
    title: "Album",
    description: "Record release",
    status: "active",
    position: null,
    createdByUserId: userId,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const task = taskDetail("Record vocals", null);
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project mutation.");
      },
      async listActiveProjects() {
        return [project];
      },
      async getProject() {
        return project;
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask mutation.");
      },
      async createTask() {
        throw new Error("Unexpected task mutation.");
      },
      async listActiveTasks() {
        return [task];
      },
    },
    emptyTaskSkillsService(),
    undefined,
    undefined,
    undefined,
    undefined,
    {
      publishChange(change) {
        realtimeChanges.push(change);
      },
    },
  );
  const context = { workspaceId, userId, projectId };

  const projectList = await dispatcher.dispatchToolCall(
    { arguments: {}, callId: "call-project-list", toolName: "project_list" },
    context,
  );
  const projectDetail = await dispatcher.dispatchToolCall(
    {
      arguments: { projectId },
      callId: "call-project-get",
      toolName: "project_get",
    },
    context,
  );
  const taskList = await dispatcher.dispatchToolCall(
    { arguments: {}, callId: "call-task-list", toolName: "task_list" },
    context,
  );

  assert.equal(projectList.result?.["count"], 1);
  assert.deepEqual(projectList.result?.["projects"], [
    {
      id: projectId,
      key: "ALB",
      slug: "album",
      title: "Album",
      description: "Record release",
      status: "active",
    },
  ]);
  assert.equal(projectDetail.result?.["kind"], "project_found");
  assert.equal(projectDetail.result?.["id"], projectId);
  assert.equal(taskList.result?.["projectId"], projectId);
  assert.equal(taskList.result?.["count"], 1);
  assert.deepEqual(realtimeChanges, []);
});

test("BackendAgentToolOperationDispatcher creates a project through the service layer", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject(actualWorkspaceId, actualUserId, input) {
        calls.push({ actualWorkspaceId, actualUserId, input });
        return new ProjectDetailDto({
          id: projectId,
          workspaceId,
          key: "AR",
          slug: "album-release",
          title: input.title,
          description: input.description ?? null,
          status: null,
          position: null,
          createdByUserId: userId,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task call.");
      },
    },
    emptyTaskSkillsService(),
    {
      async getWorkspace() {
        return new WorkspaceDetailDto({
          id: workspaceId,
          name: "tAsk Local",
          slug: "task-local",
          description: null,
          members: [],
          createdAt: now,
          updatedAt: now,
        });
      },
      async listMembers() {
        return [];
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-project-create",
      toolName: "project_create",
      arguments: { title: "Album recording", workspaceId: "untrusted" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    id: projectId,
    key: "AR",
    slug: "album-release",
    workspaceSlug: "task-local",
    title: "Album recording",
    workspaceId,
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualUserId: userId,
      input: { title: "Album recording" },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher creates a task in the selected project", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask(actualWorkspaceId, actualProjectId, actualUserId, input) {
        calls.push({ actualWorkspaceId, actualProjectId, actualUserId, input });
        return new TaskDetailDto({
          id: taskId,
          workspaceId,
          projectId,
          number: 1,
          parentTaskId: null,
          title: input.title,
          description: input.description ?? null,
          statusId: null,
          assigneeUserId: null,
          createdByUserId: userId,
          position: "1000",
          dueAt: null,
          sourceSkillId: null,
          sourceSkillVersionId: null,
          metadata: {},
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
    emptyTaskSkillsService(),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-create",
      toolName: "task_create",
      arguments: { projectId, title: "Record vocals" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    id: taskId,
    number: 1,
    projectId,
    title: "Record vocals",
    workspaceId,
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualProjectId: projectId,
      actualUserId: userId,
      input: { title: "Record vocals" },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher applies one matching task template", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("A plain task must not be created when a template matches.");
      },
    },
    taskSkillsService({
      skills: [taskSkillSummary({ aliases: ["песня"], name: "Песня" })],
      onApply(actualWorkspaceId, actualTaskSkillId, actualUserId, input) {
        calls.push({
          actualWorkspaceId,
          actualTaskSkillId,
          actualUserId,
          input,
        });
      },
    }),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-from-template",
      toolName: "task_create",
      arguments: { projectId, title: "хуе морхэ" },
    },
    { workspaceId, userId, inputText: 'добавь задачу на песню "хуе морхэ"' },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    kind: "task_skill_applied",
    id: taskId,
    number: 1,
    projectId,
    title: "хуе морхэ",
    workspaceId,
    taskSkillId,
    taskSkillVersion: 1,
    createdSubtaskCount: 2,
    subtasks: [
      { id: "66666666-6666-4666-8666-666666666666", number: 2, title: "Step one" },
      { id: "66666666-6666-4666-8666-666666666666", number: 2, title: "Step two" },
    ],
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualTaskSkillId: taskSkillId,
      actualUserId: userId,
      input: { projectId, rootTaskTitle: "хуе морхэ" },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher creates listed project items as independent templated roots", async () => {
  const projectCalls: unknown[] = [];
  const appliedTitles: string[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject(actualWorkspaceId, actualUserId, input) {
        projectCalls.push({ actualWorkspaceId, actualUserId, input });
        return new ProjectDetailDto({
          id: projectId,
          workspaceId,
          key: "ALB",
          slug: "album",
          title: input.title,
          description: input.description ?? null,
          status: null,
          position: null,
          createdByUserId: userId,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Peer songs must not be added as subtasks.");
      },
      async createTask() {
        throw new Error("The matching song template must be applied.");
      },
    },
    taskSkillsService({
      skills: [taskSkillSummary({ aliases: ["песня"], name: "Песня" })],
      onApply(_workspaceId, _skillId, _userId, input) {
        appliedTitles.push(input.rootTaskTitle);
      },
    }),
  );
  const titles = [
    "Descent",
    "Vessel",
    "Together",
    "Blind Fear",
    "Инструментал",
    "Breaking Through",
    "Crown of Ash",
    "The Mirror Throne",
  ];

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-project-with-songs",
      toolName: "project_create",
      arguments: {
        title: "Album",
        taskTypeHint: "песня",
        tasks: titles.map((title) => ({ title })),
      },
    },
    { workspaceId, userId, inputText: "Создай проект с 8 песнями" },
  );

  assert.equal(result.status, "success");
  assert.equal(result.result?.["kind"], "project_with_tasks_created");
  assert.equal(result.result?.["createdTaskCount"], 8);
  assert.equal(result.result?.["createdSubtaskCount"], 16);
  assert.deepEqual(appliedTitles, titles);
  assert.equal(projectCalls.length, 1);
});

test("BackendAgentToolOperationDispatcher requests a choice when several templates match", async () => {
  const secondSkillId = "88888888-8888-4888-8888-888888888888";
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Task must not be created before template selection.");
      },
    },
    taskSkillsService({
      skills: [
        taskSkillSummary({ aliases: ["песня"], name: "Песня" }),
        taskSkillSummary({
          aliases: ["песенный релиз"],
          id: secondSkillId,
          name: "Песня для релиза",
        }),
      ],
      onApply() {
        throw new Error("Template must not be applied before selection.");
      },
    }),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-template-choice",
      toolName: "task_create",
      arguments: { projectId, title: "хуе морхэ" },
    },
    { workspaceId, userId, inputText: 'добавь задачу на песню "хуе морхэ"' },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    kind: "task_skill_selection_required",
    projectId,
    title: "хуе морхэ",
    candidates: [
      { id: taskSkillId, name: "Песня", description: "Template" },
      { id: secondSkillId, name: "Песня для релиза", description: "Template" },
    ],
  });
});

test("BackendAgentToolOperationDispatcher applies an explicitly selected template", async () => {
  let applied = false;
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("A selected template must be applied.");
      },
    },
    taskSkillsService({
      skills: [],
      onApply() {
        applied = true;
      },
    }),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-selected-template",
      toolName: "task_create",
      arguments: { projectId, taskSkillId, title: "хуе морхэ" },
    },
    { workspaceId, userId, inputText: "Используй первый шаблон" },
  );

  assert.equal(result.status, "success");
  assert.equal(applied, true);
  assert.equal(result.result?.["kind"], "task_skill_applied");
});

test("findMatchingTaskSkills handles Russian inflection and ignores generic task words", () => {
  const song = taskSkillSummary({ aliases: [], name: "Песня" });
  const generic = taskSkillSummary({
    aliases: [],
    id: "99999999-9999-4999-8999-999999999999",
    name: "Задача релиза",
  });

  assert.deepEqual(
    findMatchingTaskSkills([song, generic], 'добавь задачу на песню "хуе морхэ"').map(
      (skill) => skill.id,
    ),
    [taskSkillId],
  );
});

type TaskSkillsServiceDouble = Pick<
  TaskSkillsService,
  "applyTaskSkill" | "createTaskSkill" | "listActiveTaskSkills"
>;

function emptyTaskSkillsService(): TaskSkillsServiceDouble {
  return taskSkillsService({ skills: [] });
}

function taskSkillsService(options: {
  skills: TaskSkillSummaryDto[];
  onApply?: (
    workspaceId: string,
    taskSkillId: string,
    userId: string,
    input: { projectId: string; rootTaskTitle: string },
  ) => void;
  onCreate?: Parameters<TaskSkillsServiceDouble["createTaskSkill"]> extends [
    infer _WorkspaceId,
    infer _UserId,
    infer TInput,
  ]
    ? (workspaceId: string, userId: string, input: TInput) => void
    : never;
}): TaskSkillsServiceDouble {
  return {
    async createTaskSkill(actualWorkspaceId, actualUserId, input) {
      options.onCreate?.(actualWorkspaceId, actualUserId, input);
      return new TaskSkillDetailDto({
        id: taskSkillId,
        workspaceId: actualWorkspaceId,
        name: input.name,
        description: input.description ?? null,
        aliases: input.aliases ?? [],
        createdByUserId: actualUserId,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
        versions: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            workspaceId: actualWorkspaceId,
            taskSkillId,
            version: 1,
            definition: input.definition,
            createdByUserId: actualUserId,
            createdAt: now,
          },
        ],
      });
    },
    async listActiveTaskSkills(): Promise<TaskSkillSummaryDto[]> {
      return options.skills;
    },
    async applyTaskSkill(
      actualWorkspaceId,
      actualTaskSkillId,
      actualUserId,
      input,
    ): Promise<TaskSkillApplyResultDto> {
      options.onApply?.(actualWorkspaceId, actualTaskSkillId, actualUserId, input);
      const rootTask = taskDetail(input.rootTaskTitle, null);
      return new TaskSkillApplyResultDto({
        workspaceId: actualWorkspaceId,
        projectId: input.projectId,
        taskSkillId: actualTaskSkillId,
        taskSkillVersionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        taskSkillVersion: 1,
        rootTask,
        subtasks: [taskDetail("Step one", taskId), taskDetail("Step two", taskId)],
      });
    },
  };
}

function taskSkillSummary(
  overrides: Partial<Pick<TaskSkillSummary, "aliases" | "id" | "name">>,
): TaskSkillSummaryDto {
  return new TaskSkillSummaryDto({
    id: overrides.id ?? taskSkillId,
    workspaceId,
    name: overrides.name ?? "Template",
    description: "Template",
    aliases: overrides.aliases ?? [],
    createdByUserId: userId,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

function taskDetail(title: string, parentTaskId: string | null): TaskDetailDto {
  return new TaskDetailDto({
    id: parentTaskId === null ? taskId : "66666666-6666-4666-8666-666666666666",
    workspaceId,
    projectId,
    number: parentTaskId === null ? 1 : 2,
    parentTaskId,
    title,
    description: null,
    statusId: null,
    assigneeUserId: null,
    createdByUserId: userId,
    position: "1000",
    dueAt: null,
    sourceSkillId: taskSkillId,
    sourceSkillVersionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    metadata: {},
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

test("BackendAgentToolOperationDispatcher creates validated subtasks through TasksService", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks(actualWorkspaceId, actualProjectId, actualTaskId, actualUserId, input) {
        calls.push({
          actualWorkspaceId,
          actualProjectId,
          actualTaskId,
          actualUserId,
          input,
        });
        return input.subtasks.map(
          (subtask, index) =>
            new TaskDetailDto({
              id: `60000000-0000-4000-8000-00000000000${index}`,
              workspaceId,
              projectId,
              number: index + 2,
              parentTaskId: taskId,
              title: subtask.title,
              description: subtask.description ?? null,
              statusId: null,
              assigneeUserId: null,
              createdByUserId: userId,
              position: String(index),
              dueAt: null,
              sourceSkillId: null,
              sourceSkillVersionId: null,
              metadata: {},
              archivedAt: null,
              createdAt: now,
              updatedAt: now,
            }),
        );
      },
      async createTask() {
        throw new Error("Unexpected task create call.");
      },
    },
    emptyTaskSkillsService(),
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-add-subtasks",
      toolName: "task_add_subtasks",
      arguments: {
        projectId,
        taskId,
        subtasks: [{ title: "Vocals" }, { title: "Mix", description: "Final mix" }],
      },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    createdCount: 2,
    projectId,
    taskId,
    taskIds: ["60000000-0000-4000-8000-000000000000", "60000000-0000-4000-8000-000000000001"],
    titles: ["Vocals", "Mix"],
    workspaceId,
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualProjectId: projectId,
      actualTaskId: taskId,
      actualUserId: userId,
      input: {
        subtasks: [{ title: "Vocals" }, { title: "Mix", description: "Final mix" }],
      },
    },
  ]);
});

test("BackendAgentToolOperationDispatcher resolves an inflected member name and assigns the task", async () => {
  const calls: unknown[] = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task create call.");
      },
      async updateTaskAssignee(
        actualWorkspaceId,
        actualProjectId,
        actualTaskId,
        actualUserId,
        input,
      ) {
        calls.push({
          actualWorkspaceId,
          actualProjectId,
          actualTaskId,
          actualUserId,
          input,
        });
        return new TaskDetailDto({
          ...taskDetail("Запись барабанов", null),
          assigneeUserId: input.assigneeUserId,
        });
      },
    },
    emptyTaskSkillsService(),
    {
      async listMembers() {
        return [
          {
            id: "99999999-9999-4999-8999-999999999999",
            workspaceId,
            userId: marinaUserId,
            role: "member",
            displayName: "Марина Орлова",
            email: "marina@example.local",
            avatarUrl: null,
            createdAt: now,
            updatedAt: now,
          },
        ];
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-task-assignee",
      toolName: "task_set_assignee",
      arguments: { projectId, taskId, assignee: "марину орлову" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.status, "success");
  assert.deepEqual(result.result, {
    kind: "task_assignee_updated",
    id: taskId,
    projectId,
    taskId,
    assigneeUserId: marinaUserId,
    assigneeName: "Марина Орлова",
    workspaceId,
  });
  assert.deepEqual(calls, [
    {
      actualWorkspaceId: workspaceId,
      actualProjectId: projectId,
      actualTaskId: taskId,
      actualUserId: userId,
      input: { assigneeUserId: marinaUserId },
    },
  ]);
});

test("findMatchingWorkspaceMembers matches Russian grammatical endings", () => {
  const marina = {
    userId: marinaUserId,
    displayName: "Марина Орлова",
    email: "marina@example.local",
  };
  assert.deepEqual(findMatchingWorkspaceMembers([marina], "марину орлову"), [marina]);
});

test("BackendAgentToolOperationDispatcher updates task fields, status, due date, and links", async () => {
  const statusId = "aaaaaaaa-0000-4000-8000-000000000001";
  const attachmentId = "aaaaaaaa-0000-4000-8000-000000000002";
  const mutationCalls: string[] = [];
  const realtimeChanges: Array<{
    mutationKind: "created" | "deleted" | "updated";
    workspaceId: string;
    projectId?: string | null;
    taskId?: string | null;
  }> = [];
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async getTaskById(_workspaceId, actualTaskId) {
        assert.equal(actualTaskId, taskId);
        return new TaskDetailDto(taskDetail("Task", null));
      },
      async getTaskByIdentifier(_workspaceId, identifier) {
        assert.deepEqual(identifier, { projectKey: "ZNA", taskNumber: 26 });
        return new TaskDetailDto(taskDetail("Task", null));
      },
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task create call.");
      },
      async updateTask(_workspaceId, _projectId, _taskId, _userId, input) {
        mutationCalls.push("update");
        return new TaskDetailDto({
          ...taskDetail(input.title ?? "Old title", null),
          description: input.description ?? null,
        });
      },
      async updateTaskStatus(_workspaceId, _projectId, _taskId, _userId, input) {
        mutationCalls.push("status");
        return new TaskDetailDto({ ...taskDetail("Task", null), statusId: input.statusId });
      },
      async updateTaskDueDate(_workspaceId, _projectId, _taskId, _userId, input) {
        mutationCalls.push("due");
        return new TaskDetailDto({
          ...taskDetail("Task", null),
          dueAt: input.dueAt === null ? null : new Date(input.dueAt),
        });
      },
    },
    emptyTaskSkillsService(),
    undefined,
    {
      async listStatuses() {
        return [
          {
            id: statusId,
            workspaceId,
            projectId,
            name: "In progress",
            color: "#3b82f6",
            position: "2000",
            isDone: false,
            createdAt: now,
            updatedAt: now,
          },
        ];
      },
    },
    {
      async createTaskLinkAttachment(_workspaceId, _projectId, _taskId, _userId, input) {
        mutationCalls.push("attachment");
        return {
          id: attachmentId,
          workspaceId,
          targetType: "task",
          targetId: taskId,
          kind: "link",
          title: input.title ?? null,
          url: input.url,
          storageKey: null,
          telegramFileId: null,
          mimeType: null,
          sizeBytes: null,
          createdByUserId: userId,
          createdAt: now,
        };
      },
    },
    {
      async search(_workspaceId, _userId, input) {
        assert.equal(input.query, "Task");
        return {
          items: [
            {
              id: taskId,
              type: "task",
              title: "Task",
              description: null,
              projectId,
            },
          ],
          page: 1,
          pageSize: 50,
          total: 1,
        };
      },
    },
    {
      publishChange(change) {
        realtimeChanges.push(change);
      },
    },
  );

  const context = { workspaceId, userId };
  const lookup = await dispatcher.dispatchToolCall(
    {
      callId: "call-lookup",
      toolName: "task_lookup",
      arguments: { reference: "http://localhost:3100/issue/ZNA-26" },
    },
    context,
  );
  const lookupById = await dispatcher.dispatchToolCall(
    {
      callId: "call-lookup-id",
      toolName: "task_lookup",
      arguments: { reference: taskId },
    },
    context,
  );
  const lookupByTitle = await dispatcher.dispatchToolCall(
    {
      callId: "call-lookup-title",
      toolName: "task_lookup",
      arguments: { reference: "Task" },
    },
    context,
  );
  const updated = await dispatcher.dispatchToolCall(
    {
      callId: "call-update",
      toolName: "task_update",
      arguments: { projectId, taskId, title: "New title", description: "**Markdown**" },
    },
    context,
  );
  const status = await dispatcher.dispatchToolCall(
    {
      callId: "call-status",
      toolName: "task_set_status",
      arguments: { projectId, taskId, statusName: "in progress" },
    },
    context,
  );
  const due = await dispatcher.dispatchToolCall(
    {
      callId: "call-due",
      toolName: "task_set_due_date",
      arguments: { projectId, taskId, dueAt: "2026-08-01T10:00:00.000Z" },
    },
    context,
  );
  const attachment = await dispatcher.dispatchToolCall(
    {
      callId: "call-attachment",
      toolName: "task_add_link_attachment",
      arguments: { projectId, taskId, url: "https://example.com/file", title: "Reference" },
    },
    context,
  );

  assert.equal(updated.result?.["kind"], "task_updated");
  assert.equal(lookup.result?.["kind"], "task_found");
  assert.equal(lookup.result?.["taskId"], taskId);
  assert.equal(lookupById.result?.["taskId"], taskId);
  assert.equal(lookupByTitle.result?.["taskId"], taskId);
  assert.equal(status.result?.["kind"], "task_status_updated");
  assert.equal(due.result?.["kind"], "task_due_date_updated");
  assert.equal(attachment.result?.["kind"], "task_link_attachment_added");
  assert.deepEqual(mutationCalls, ["update", "status", "due", "attachment"]);
  assert.deepEqual(realtimeChanges, [
    { mutationKind: "updated", workspaceId, projectId, taskId },
    { mutationKind: "updated", workspaceId, projectId, taskId },
    { mutationKind: "updated", workspaceId, projectId, taskId },
    { mutationKind: "updated", workspaceId, projectId, taskId },
  ]);
});

test("BackendAgentToolOperationDispatcher returns candidates for an ambiguous task title", async () => {
  const otherTaskId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const dispatcher = new BackendAgentToolOperationDispatcher(
    {
      async createProject() {
        throw new Error("Unexpected project call.");
      },
    },
    {
      async addTaskSubtasks() {
        throw new Error("Unexpected subtask call.");
      },
      async createTask() {
        throw new Error("Unexpected task create call.");
      },
    },
    emptyTaskSkillsService(),
    undefined,
    undefined,
    undefined,
    {
      async search() {
        return {
          items: [
            {
              id: taskId,
              type: "task",
              title: "Записать гитары",
              description: "Песня 1",
              projectId,
            },
            {
              id: otherTaskId,
              type: "task",
              title: "Записать гитары",
              description: "Песня 2",
              projectId,
            },
          ],
          page: 1,
          pageSize: 50,
          total: 2,
        };
      },
    },
  );

  const result = await dispatcher.dispatchToolCall(
    {
      callId: "call-ambiguous-lookup",
      toolName: "task_lookup",
      arguments: { reference: "Записать гитары" },
    },
    { workspaceId, userId },
  );

  assert.equal(result.result?.["kind"], "task_candidates");
  assert.deepEqual(result.result?.["candidates"], [
    {
      taskId,
      projectId,
      title: "Записать гитары",
      description: "Песня 1",
    },
    {
      taskId: otherTaskId,
      projectId,
      title: "Записать гитары",
      description: "Песня 2",
    },
  ]);
});
