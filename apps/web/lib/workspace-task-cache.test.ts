import assert from "node:assert/strict";
import test from "node:test";
import type { TaskSummary } from "@task/api-client";
import type { WorkspaceBootstrap, WorkspaceProjectReconciliation } from "./workspace-contracts.ts";
import {
  applyWorkspaceProjectReconciliation,
  applyWorkspaceTaskUpdate,
  workspaceTaskUpdateRequiresProjectReconciliation,
} from "./workspace-task-cache.ts";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const memberId = "55555555-5555-4555-8555-555555555555";
const statusId = "66666666-6666-4666-8666-666666666666";
const timestamp = "2026-07-22T10:00:00.000Z";

function createTask(
  assigneeUserId: string | null,
  overrides: Partial<Pick<TaskSummary, "position" | "statusId" | "title" | "updatedAt">> = {},
): TaskSummary {
  return {
    id: taskId,
    workspaceId,
    projectId,
    number: 1,
    parentTaskId: null,
    title: "Realtime task",
    description: null,
    statusId,
    assigneeUserId,
    createdByUserId: userId,
    position: "1000",
    dueAt: null,
    sourceSkillId: null,
    sourceSkillVersionId: null,
    metadata: {},
    archivedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function createWorkspaceBootstrap(): WorkspaceBootstrap {
  const member: WorkspaceBootstrap["currentMember"] = {
    id: memberId,
    workspaceId,
    userId,
    role: "member",
    displayName: "Realtime User",
    email: "realtime@example.com",
    avatarUrl: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return {
    availableWorkspaces: [
      {
        id: workspaceId,
        name: "Workspace",
        slug: "workspace",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    currentMember: member,
    myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
    projects: [
      {
        id: projectId,
        workspaceId,
        key: "RT",
        slug: "realtime",
        title: "Realtime",
        description: null,
        status: "active",
        position: "1000",
        createdByUserId: userId,
        archivedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    statuses: [
      {
        id: statusId,
        workspaceId,
        projectId,
        name: "In progress",
        color: "#3b82f6",
        position: "1000",
        isDone: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    taskSkills: [],
    confirmations: [],
    agentRuns: [],
    workspace: {
      id: workspaceId,
      name: "Workspace",
      slug: "workspace",
      description: null,
      members: [member],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    projectData: [],
    views: [],
  };
}

function createWorkspaceWithTask(task: TaskSummary): WorkspaceBootstrap {
  const data = createWorkspaceBootstrap();
  return {
    ...data,
    projectData: [
      {
        projectId,
        projectKey: "RT",
        projectTitle: "Realtime",
        projectless: false,
        tasks: [task],
        table: { items: [task], page: 1, pageSize: 50, total: 1 },
        matrix: {
          columns: [task],
          stages: [
            {
              id: statusId,
              name: "In progress",
              color: "#3b82f6",
              position: "1000",
              isDone: false,
            },
          ],
          cells: [{ columnTaskId: task.id, stageId: statusId, tasks: [task] }],
        },
      },
    ],
  };
}

test("applyWorkspaceTaskUpdate adds and removes current-user assignments", () => {
  const assigned = applyWorkspaceTaskUpdate(createWorkspaceBootstrap(), createTask(userId));
  assert.equal(assigned.myTasks.total, 1);
  assert.deepEqual(assigned.myTasks.items[0], {
    id: taskId,
    projectId,
    projectTitle: "Realtime",
    title: "Realtime task",
    dueAt: null,
    statusId,
    statusName: "In progress",
    statusColor: "#3b82f6",
    position: "1000",
    updatedAt: timestamp,
  });

  const unassigned = applyWorkspaceTaskUpdate(assigned, createTask(null));
  assert.equal(unassigned.myTasks.total, 0);
  assert.deepEqual(unassigned.myTasks.items, []);
});

test("applyWorkspaceTaskUpdate ignores an older targeted response", () => {
  const latestTask = createTask(userId, {
    title: "Optimistic title",
    updatedAt: "2026-07-22T10:01:00.000Z",
  });
  const data = createWorkspaceWithTask(latestTask);
  const staleTask = createTask(userId, {
    title: "Older server title",
    updatedAt: "2026-07-22T09:59:00.000Z",
  });

  const result = applyWorkspaceTaskUpdate(data, staleTask);
  assert.equal(result, data);
  assert.equal(result.projectData[0]?.tasks[0]?.title, "Optimistic title");
});

test("structural task changes request a project reconciliation", () => {
  const current = createTask(userId);
  const data = createWorkspaceWithTask(current);
  assert.equal(
    workspaceTaskUpdateRequiresProjectReconciliation(
      data,
      createTask(userId, { title: "Description-only equivalent", updatedAt: timestamp }),
    ),
    false,
  );
  assert.equal(
    workspaceTaskUpdateRequiresProjectReconciliation(
      data,
      createTask(userId, {
        position: "2000",
        updatedAt: "2026-07-22T10:01:00.000Z",
      }),
    ),
    true,
  );
  assert.equal(
    workspaceTaskUpdateRequiresProjectReconciliation(createWorkspaceBootstrap(), current),
    true,
  );
});

test("project reconciliation replaces every project representation and My Tasks", () => {
  const current = createTask(userId);
  const data = createWorkspaceWithTask(current);
  const refreshed = createTask(userId, {
    position: "2000",
    title: "Refreshed task",
    updatedAt: "2026-07-22T10:01:00.000Z",
  });
  const reconciliation: WorkspaceProjectReconciliation = {
    projectId,
    tasks: [refreshed],
    table: { items: [refreshed], page: 1, pageSize: 50, total: 1 },
    matrix: {
      columns: [refreshed],
      stages: [],
      cells: [{ columnTaskId: refreshed.id, stageId: statusId, tasks: [refreshed] }],
    },
    myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
  };

  const result = applyWorkspaceProjectReconciliation(data, reconciliation);
  assert.equal(result.projectData[0]?.tasks[0]?.title, "Refreshed task");
  assert.equal(result.projectData[0]?.table.items[0]?.position, "2000");
  assert.equal(result.projectData[0]?.matrix.cells[0]?.tasks[0]?.updatedAt, refreshed.updatedAt);
  assert.equal(result.myTasks.total, 0);
});
