import assert from "node:assert/strict";
import test from "node:test";
import type { components } from "@task/api-client";
import {
  buildProjectOverviewRows,
  buildProjectOverviewSummary,
  buildTaskTableRows,
  buildTaskTableSummary,
} from "./WorkspaceView.js";

type ProjectSummary = components["schemas"]["ProjectSummaryDto"];
type TaskSummary = components["schemas"]["TaskSummaryDto"];

const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const firstProjectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const secondProjectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

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
