import assert from "node:assert/strict";
import test from "node:test";
import type { components } from "@task/api-client";
import {
  buildAgentHistoryRows,
  buildAgentHistorySummary,
  buildKanbanColumns,
  buildKanbanSummary,
  buildMatrixColumns,
  buildMatrixSummary,
  buildMyTaskRows,
  buildMyTaskSummary,
  buildProjectOverviewRows,
  buildProjectOverviewSummary,
  buildSettingsSummary,
  buildSettingsWorkspaceRows,
  buildTaskTableRows,
  buildTaskTableSummary,
  buildTemplateSkillRows,
  buildTemplateSkillSummary,
} from "./WorkspaceView.js";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type AgentRunSummary = components["schemas"]["AgentRunSummaryDto"];
type TaskSkillSummary = components["schemas"]["TaskSkillSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];
type WorkspaceSummary = components["schemas"]["WorkspaceSummaryDto"];
type WorkspaceStatus = components["schemas"]["WorkspaceStatusDto"];

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const firstProjectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const secondProjectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const secondWorkspaceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const firstStatusId = "44444444-4444-4444-8444-444444444444";
const secondStatusId = "55555555-5555-4555-8555-555555555555";
const unknownStatusId = "66666666-6666-4666-8666-666666666666";
const firstParentTaskId = "77777777-7777-4777-8777-777777777777";
const secondParentTaskId = "88888888-8888-4888-8888-888888888888";
const unmatchedParentTaskId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("buildKanbanColumns orders statuses and groups known, unknown, and unset tasks", () => {
  assert.deepEqual(
    buildKanbanColumns(
      [projectSummary({ id: firstProjectId, title: "Album one" })],
      [
        workspaceStatus({
          id: secondStatusId,
          name: "Done",
          position: "2000",
        }),
        workspaceStatus({
          color: "#3b82f6",
          id: firstStatusId,
          name: "In progress",
          position: "1000",
        }),
      ],
      [
        taskSummary({
          dueAt: "2026-07-09T10:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
          statusId: firstStatusId,
          title: "Record vocals",
          updatedAt: "2026-07-05T10:00:00.000Z",
        }),
        taskSummary({
          id: "22222222-2222-4222-8222-222222222222",
          projectId: secondProjectId,
          statusId: unknownStatusId,
          title: "Mix outro",
          updatedAt: "2026-07-06T10:00:00.000Z",
        }),
        taskSummary({
          id: "33333333-3333-4333-8333-333333333333",
          statusId: null,
          title: "Edit drums",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
      ],
    ).map((column) => ({
      id: column.id,
      name: column.name,
      taskCount: column.taskCount,
      taskTitles: column.tasks.map((task) => task.title),
      taskProjects: column.tasks.map((task) => task.projectTitle),
    })),
    [
      {
        id: firstStatusId,
        name: "In progress",
        taskCount: 1,
        taskProjects: ["Album one"],
        taskTitles: ["Record vocals"],
      },
      {
        id: secondStatusId,
        name: "Done",
        taskCount: 0,
        taskProjects: [],
        taskTitles: [],
      },
      {
        id: "unknown-status",
        name: "Unknown status",
        taskCount: 1,
        taskProjects: ["Unknown"],
        taskTitles: ["Mix outro"],
      },
      {
        id: "unset-status",
        name: "Unset",
        taskCount: 1,
        taskProjects: ["Album one"],
        taskTitles: ["Edit drums"],
      },
    ],
  );
});

test("buildKanbanSummary counts columns, done tasks, and unset tasks", () => {
  assert.deepEqual(
    buildKanbanSummary(
      [
        workspaceStatus({ id: firstStatusId, isDone: false }),
        workspaceStatus({ id: secondStatusId, isDone: true }),
      ],
      [
        taskSummary({ statusId: firstStatusId }),
        taskSummary({ statusId: secondStatusId }),
        taskSummary({ statusId: unknownStatusId }),
        taskSummary({ statusId: null }),
      ],
    ),
    {
      columnCount: 4,
      doneTaskCount: 1,
      taskCount: 4,
      unsetTaskCount: 1,
    },
  );
});

test("buildMatrixColumns orders parents and groups child tasks", () => {
  assert.deepEqual(
    buildMatrixColumns([
      taskSummary({
        id: secondParentTaskId,
        position: "2000",
        title: "Song B",
        updatedAt: "2026-07-05T10:00:00.000Z",
      }),
      taskSummary({
        id: firstParentTaskId,
        position: "1000",
        title: "Song A",
        updatedAt: "2026-07-04T10:00:00.000Z",
      }),
      taskSummary({
        id: "11111111-1111-4111-8111-111111111111",
        parentTaskId: firstParentTaskId,
        position: "2000",
        title: "Mix",
      }),
      taskSummary({
        id: "22222222-2222-4222-8222-222222222222",
        parentTaskId: firstParentTaskId,
        position: "1000",
        title: "Record",
      }),
      taskSummary({
        id: "33333333-3333-4333-8333-333333333333",
        parentTaskId: unmatchedParentTaskId,
        title: "Lost subtask",
      }),
    ]).map((column) => ({
      childCount: column.childCount,
      id: column.id,
      title: column.title,
      cellTitles: column.cells.map((cell) => cell.title),
    })),
    [
      {
        cellTitles: ["Record", "Mix"],
        childCount: 2,
        id: firstParentTaskId,
        title: "Song A",
      },
      {
        cellTitles: [],
        childCount: 0,
        id: secondParentTaskId,
        title: "Song B",
      },
      {
        cellTitles: ["Lost subtask"],
        childCount: 1,
        id: "unmatched-parent",
        title: "Unmatched parent",
      },
    ],
  );
});

test("buildMatrixSummary counts parent, child, due, and unassigned tasks", () => {
  assert.deepEqual(
    buildMatrixSummary([
      taskSummary({
        assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        dueAt: "2026-07-09T10:00:00.000Z",
        id: firstParentTaskId,
      }),
      taskSummary({
        assigneeUserId: null,
        id: "11111111-1111-4111-8111-111111111111",
        parentTaskId: firstParentTaskId,
      }),
      taskSummary({
        dueAt: "2026-07-10T10:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        parentTaskId: unmatchedParentTaskId,
      }),
    ]),
    {
      dueTaskCount: 2,
      parentTaskCount: 1,
      subtaskCount: 2,
      unassignedTaskCount: 2,
    },
  );
});

test("buildSettingsWorkspaceRows maps loaded workspace rows", () => {
  assert.deepEqual(
    buildSettingsWorkspaceRows([
      workspaceSummary({
        name: "Studio",
        slug: "studio",
        updatedAt: "2026-07-05T10:00:00.000Z",
      }),
    ]),
    [
      {
        id: workspaceId,
        name: "Studio",
        slug: "studio",
        updatedAtLabel: "2026-07-05",
      },
    ],
  );
});

test("buildSettingsSummary maps selected labels and loaded counts", () => {
  assert.deepEqual(
    buildSettingsSummary({
      projects: [
        projectSummary({ id: firstProjectId, title: "Album one" }),
        projectSummary({ id: secondProjectId, title: "Album two" }),
      ],
      selectedProjectId: secondProjectId,
      selectedWorkspaceId: secondWorkspaceId,
      skills: [taskSkillSummary()],
      statuses: [workspaceStatus(), workspaceStatus({ id: secondStatusId })],
      tasks: [taskSummary(), taskSummary()],
      workspaces: [
        workspaceSummary({ id: workspaceId, name: "Studio" }),
        workspaceSummary({ id: secondWorkspaceId, name: "Label" }),
      ],
    }),
    {
      projectCount: 2,
      selectedProjectLabel: "Album two",
      selectedWorkspaceLabel: "Label",
      skillCount: 1,
      statusCount: 2,
      taskCount: 2,
      workspaceCount: 2,
    },
  );
});

test("buildSettingsSummary falls back when selected context is absent", () => {
  assert.deepEqual(
    buildSettingsSummary({
      projects: [],
      selectedProjectId: null,
      selectedWorkspaceId: null,
      skills: [],
      statuses: [],
      tasks: [],
      workspaces: [],
    }),
    {
      projectCount: 0,
      selectedProjectLabel: "No selected project",
      selectedWorkspaceLabel: "No selected workspace",
      skillCount: 0,
      statusCount: 0,
      taskCount: 0,
      workspaceCount: 0,
    },
  );
});

test("buildAgentHistorySummary maps selected context and audit counts", () => {
  assert.deepEqual(
    buildAgentHistorySummary({
      agentRuns: [agentRunSummary()],
      projects: [
        projectSummary({ id: firstProjectId, title: "Album one" }),
        projectSummary({ id: secondProjectId, title: "Album two" }),
      ],
      selectedProjectId: firstProjectId,
      selectedWorkspaceId: workspaceId,
      skills: [taskSkillSummary(), taskSkillSummary({ name: "Release" })],
      statuses: [workspaceStatus()],
      tasks: [taskSummary(), taskSummary()],
      workspaces: [workspaceSummary({ id: workspaceId, name: "Studio" })],
    }),
    {
      projectCount: 2,
      runCount: 1,
      selectedProjectLabel: "Album one",
      selectedWorkspaceLabel: "Studio",
      skillCount: 2,
      statusCount: 1,
      taskCount: 2,
    },
  );
});

test("buildAgentHistorySummary falls back when context is absent", () => {
  assert.deepEqual(
    buildAgentHistorySummary({
      agentRuns: [],
      projects: [],
      selectedProjectId: null,
      selectedWorkspaceId: null,
      skills: [],
      statuses: [],
      tasks: [],
      workspaces: [],
    }),
    {
      projectCount: 0,
      runCount: 0,
      selectedProjectLabel: "No selected project",
      selectedWorkspaceLabel: "No selected workspace",
      skillCount: 0,
      statusCount: 0,
      taskCount: 0,
    },
  );
});

test("buildAgentHistoryRows maps loaded run summaries", () => {
  assert.deepEqual(
    buildAgentHistoryRows([
      agentRunSummary({
        createdAt: "2026-07-05T09:00:00.000Z",
        inputText: "@task prepare label update",
        source: "telegram",
        status: "waiting_confirmation",
        updatedAt: "2026-07-06T10:00:00.000Z",
      }),
    ]),
    [
      {
        detail: "telegram - 2026-07-05",
        id: "11111111-1111-4111-8111-111111111111",
        statusLabel: "waiting_confirmation",
        title: "@task prepare label update",
        updatedAtLabel: "2026-07-06",
      },
    ],
  );
});

test("buildMyTaskRows sorts due tasks first and maps loaded task fields", () => {
  assert.deepEqual(
    buildMyTaskRows(
      [projectSummary({ id: firstProjectId, title: "Album one" })],
      [
        taskSummary({
          id: "11111111-1111-4111-8111-111111111111",
          projectId: secondProjectId,
          title: "Mix outro",
          updatedAt: "2026-07-06T10:00:00.000Z",
        }),
        taskSummary({
          assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          dueAt: "2026-07-09T10:00:00.000Z",
          id: "22222222-2222-4222-8222-222222222222",
          title: "Record vocals",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
        taskSummary({
          dueAt: "2026-07-08T10:00:00.000Z",
          id: "33333333-3333-4333-8333-333333333333",
          title: "Edit drums",
          updatedAt: "2026-07-05T10:00:00.000Z",
        }),
      ],
    ),
    [
      {
        assigneeLabel: "Unassigned",
        dueDateLabel: "2026-07-08",
        id: "33333333-3333-4333-8333-333333333333",
        projectTitle: "Album one",
        title: "Edit drums",
        updatedAtLabel: "2026-07-05",
      },
      {
        assigneeLabel: "Assigned",
        dueDateLabel: "2026-07-09",
        id: "22222222-2222-4222-8222-222222222222",
        projectTitle: "Album one",
        title: "Record vocals",
        updatedAtLabel: "2026-07-04",
      },
      {
        assigneeLabel: "Unassigned",
        dueDateLabel: "No due date",
        id: "11111111-1111-4111-8111-111111111111",
        projectTitle: "Unknown",
        title: "Mix outro",
        updatedAtLabel: "2026-07-06",
      },
    ],
  );
});

test("buildMyTaskSummary counts assigned, due, and latest-day tasks", () => {
  assert.deepEqual(
    buildMyTaskSummary([
      taskSummary({
        assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        dueAt: "2026-07-09T10:00:00.000Z",
        updatedAt: "2026-07-05T10:00:00.000Z",
      }),
      taskSummary({
        assigneeUserId: null,
        dueAt: null,
        updatedAt: "2026-07-06T09:00:00.000Z",
      }),
      taskSummary({
        assigneeUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        dueAt: "2026-07-10T10:00:00.000Z",
        updatedAt: "2026-07-06T12:00:00.000Z",
      }),
    ]),
    {
      assignedTaskCount: 2,
      dueTaskCount: 2,
      recentlyUpdatedTaskCount: 2,
      taskCount: 3,
    },
  );
});

test("buildProjectOverviewRows summarizes project task activity", () => {
  assert.deepEqual(
    buildProjectOverviewRows(
      [
        projectSummary({
          description: "Album release",
          id: firstProjectId,
          status: "recording",
          title: "First album",
          updatedAt: "2026-07-01T10:00:00.000Z",
        }),
        projectSummary({
          id: secondProjectId,
          title: "Second album",
          updatedAt: "2026-07-03T10:00:00.000Z",
        }),
      ],
      [
        taskSummary({
          assigneeUserId: null,
          dueAt: "2026-07-09T10:00:00.000Z",
          projectId: firstProjectId,
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
        taskSummary({
          assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          projectId: firstProjectId,
          updatedAt: "2026-07-02T10:00:00.000Z",
        }),
      ],
    ),
    [
      {
        description: "Album release",
        dueSoonTaskCount: 1,
        id: firstProjectId,
        latestActivityLabel: "2026-07-04",
        statusLabel: "recording",
        taskCount: 2,
        title: "First album",
        unassignedTaskCount: 1,
      },
      {
        description: "No description",
        dueSoonTaskCount: 0,
        id: secondProjectId,
        latestActivityLabel: "2026-07-03",
        statusLabel: "Active",
        taskCount: 0,
        title: "Second album",
        unassignedTaskCount: 0,
      },
    ],
  );
});

test("buildProjectOverviewSummary counts loaded project tasks", () => {
  assert.deepEqual(
    buildProjectOverviewSummary(
      [
        projectSummary({ id: firstProjectId, title: "First album" }),
        projectSummary({ id: secondProjectId, title: "Second album" }),
      ],
      [
        taskSummary({ assigneeUserId: null, dueAt: "2026-07-09T10:00:00.000Z" }),
        taskSummary({ assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }),
      ],
    ),
    {
      dueSoonTaskCount: 1,
      projectCount: 2,
      taskCount: 2,
      unassignedTaskCount: 1,
    },
  );
});

test("buildTaskTableRows maps loaded tasks into table rows", () => {
  const parentTaskId = "11111111-1111-4111-8111-111111111111";

  assert.deepEqual(
    buildTaskTableRows(
      [projectSummary({ id: firstProjectId, title: "Album one" })],
      [
        taskSummary({
          id: parentTaskId,
          title: "Intro",
          updatedAt: "2026-07-03T10:00:00.000Z",
        }),
        taskSummary({
          assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          dueAt: "2026-07-09T10:00:00.000Z",
          id: "22222222-2222-4222-8222-222222222222",
          parentTaskId,
          title: "Record bass",
          updatedAt: "2026-07-04T10:00:00.000Z",
        }),
      ],
    ),
    [
      {
        assigneeLabel: "Unassigned",
        dueDateLabel: "No due date",
        id: parentTaskId,
        parentLabel: "Parent task",
        projectTitle: "Album one",
        title: "Intro",
        updatedAtLabel: "2026-07-03",
      },
      {
        assigneeLabel: "Assigned",
        dueDateLabel: "2026-07-09",
        id: "22222222-2222-4222-8222-222222222222",
        parentLabel: "Intro",
        projectTitle: "Album one",
        title: "Record bass",
        updatedAtLabel: "2026-07-04",
      },
    ],
  );
});

test("buildTaskTableSummary counts loaded task table states", () => {
  const taskWithOmittedOptionalFields = taskSummary();
  delete taskWithOmittedOptionalFields.assigneeUserId;
  delete taskWithOmittedOptionalFields.dueAt;

  assert.deepEqual(
    buildTaskTableSummary([
      taskSummary({ assigneeUserId: null, dueAt: "2026-07-09T10:00:00.000Z" }),
      taskSummary({ assigneeUserId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" }),
      taskWithOmittedOptionalFields,
    ]),
    {
      dueSoonTaskCount: 1,
      taskCount: 3,
      unassignedTaskCount: 2,
    },
  );
});

test("buildTemplateSkillRows maps loaded task skills into template rows", () => {
  assert.deepEqual(
    buildTemplateSkillRows([
      taskSkillSummary({
        aliases: ["song", "track"],
        description: "Creates a song task tree",
        name: "Song",
        updatedAt: "2026-07-05T10:00:00.000Z",
      }),
      taskSkillSummary({
        aliases: [],
        description: null,
        name: "Release",
        updatedAt: "2026-07-06T10:00:00.000Z",
      }),
    ]),
    [
      {
        aliasLabel: "song, track",
        description: "Creates a song task tree",
        id: "99999999-9999-4999-8999-999999999999",
        name: "Song",
        updatedAtLabel: "2026-07-05",
      },
      {
        aliasLabel: "No aliases",
        description: "No description",
        id: "99999999-9999-4999-8999-999999999999",
        name: "Release",
        updatedAtLabel: "2026-07-06",
      },
    ],
  );
});

test("buildTemplateSkillSummary counts aliases and missing descriptions", () => {
  const skillWithOmittedDescription = taskSkillSummary({ aliases: ["clip"] });
  delete skillWithOmittedDescription.description;

  assert.deepEqual(
    buildTemplateSkillSummary([
      taskSkillSummary({ aliases: ["song"], description: "Creates songs" }),
      taskSkillSummary({ aliases: [], description: null }),
      skillWithOmittedDescription,
    ]),
    {
      skillCount: 3,
      skillsWithAliasesCount: 2,
      skillsWithoutDescriptionCount: 2,
    },
  );
});

function projectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    archivedAt: null,
    createdAt: "2026-07-01T09:00:00.000Z",
    createdByUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    description: null,
    id: firstProjectId,
    position: "1000",
    status: null,
    title: "Album",
    updatedAt: "2026-07-01T10:00:00.000Z",
    workspaceId,
    ...overrides,
  };
}

function agentRunSummary(overrides: Partial<AgentRunSummary> = {}): AgentRunSummary {
  return {
    createdAt: "2026-07-01T09:00:00.000Z",
    error: null,
    finalResponse: "Done.",
    id: "11111111-1111-4111-8111-111111111111",
    inputText: "@task summarize the plan",
    model: "openai/gpt-5",
    source: "web",
    sourceMessageId: null,
    status: "completed",
    updatedAt: "2026-07-01T10:00:00.000Z",
    userId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    workspaceId,
    ...overrides,
  };
}

function taskSkillSummary(overrides: Partial<TaskSkillSummary> = {}): TaskSkillSummary {
  return {
    aliases: [],
    archivedAt: null,
    createdAt: "2026-07-01T09:00:00.000Z",
    createdByUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    description: null,
    id: "99999999-9999-4999-8999-999999999999",
    name: "Skill",
    updatedAt: "2026-07-01T10:00:00.000Z",
    workspaceId,
    ...overrides,
  };
}

function workspaceStatus(overrides: Partial<WorkspaceStatus> = {}): WorkspaceStatus {
  return {
    color: "#6a756f",
    createdAt: "2026-07-01T09:00:00.000Z",
    id: firstStatusId,
    isDone: false,
    name: "Open",
    position: "1000",
    updatedAt: "2026-07-01T10:00:00.000Z",
    workspaceId,
    ...overrides,
  };
}

function workspaceSummary(overrides: Partial<WorkspaceSummary> = {}): WorkspaceSummary {
  return {
    createdAt: "2026-07-01T09:00:00.000Z",
    id: workspaceId,
    name: "Workspace",
    slug: "workspace",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

function taskSummary(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    archivedAt: null,
    assigneeUserId: null,
    createdAt: "2026-07-01T09:00:00.000Z",
    createdByUserId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    description: null,
    dueAt: null,
    id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    metadata: {},
    parentTaskId: null,
    position: "1000",
    projectId: firstProjectId,
    sourceSkillId: null,
    sourceSkillVersionId: null,
    statusId: null,
    title: "Task",
    updatedAt: "2026-07-01T10:00:00.000Z",
    workspaceId,
    ...overrides,
  };
}
