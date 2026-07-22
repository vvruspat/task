import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceBootstrapRequest } from "./workspace-bootstrap.ts";
import type { WorkspaceBootstrap } from "./workspace-contracts.ts";
import {
  resolveWorkspaceServerSnapshot,
  type WorkspaceServerSnapshot,
} from "./workspace-server-snapshot.ts";

const shellRequest: WorkspaceBootstrapRequest = {
  includeProjectTasks: false,
  includeTaskSkills: false,
  projectSelector: null,
  scope: "shell",
  viewSelector: null,
};
const projectRequest: WorkspaceBootstrapRequest = {
  includeProjectTasks: true,
  includeTaskSkills: false,
  projectSelector: "album",
  scope: "project",
  viewSelector: null,
};

test("a fresh server snapshot replaces older client route data", () => {
  const current = workspaceBootstrap("old", []);
  const incoming = workspaceBootstrap("fresh", [task("task-1", "fresh")]);
  const resolved = resolveWorkspaceServerSnapshot(
    current,
    shellRequest,
    snapshot(incoming, projectRequest, 200),
    100,
  );
  assert.equal(resolved.data?.workspace.name, "fresh");
  assert.equal(resolved.data?.projectData[0]?.tasks[0]?.title, "fresh");
});

test("a stale server snapshot fills a missing route slice without overwriting client state", () => {
  const current = workspaceBootstrap("locally renamed", []);
  const incoming = workspaceBootstrap("old server name", [task("task-1", "server task")]);
  const resolved = resolveWorkspaceServerSnapshot(
    current,
    shellRequest,
    snapshot(incoming, projectRequest, 100),
    200,
  );
  assert.equal(resolved.data?.workspace.name, "locally renamed");
  assert.equal(resolved.data?.projectData[0]?.tasks[0]?.title, "server task");
});

test("a stale server snapshot preserves a newer client task slice", () => {
  const current = workspaceBootstrap("workspace", [task("task-1", "optimistic")]);
  const incoming = workspaceBootstrap("workspace", [task("task-1", "stale")]);
  const resolved = resolveWorkspaceServerSnapshot(
    current,
    projectRequest,
    snapshot(incoming, projectRequest, 100),
    200,
  );
  assert.equal(resolved.data?.projectData[0]?.tasks[0]?.title, "optimistic");
});

function snapshot(
  body: WorkspaceBootstrap,
  request: WorkspaceBootstrapRequest,
  capturedAt: number,
): WorkspaceServerSnapshot {
  return { body, capturedAt, id: `snapshot-${capturedAt}`, request, requestKey: "workspace:route" };
}

function workspaceBootstrap(
  name: string,
  tasks: WorkspaceBootstrap["projectData"][number]["tasks"],
): WorkspaceBootstrap {
  return {
    agentRuns: [],
    availableWorkspaces: [
      {
        createdAt: "2026-07-22T00:00:00.000Z",
        id: "workspace-id",
        name,
        slug: "workspace",
        updatedAt: "2026-07-22T00:00:00.000Z",
      },
    ],
    confirmations: [],
    currentMember: {
      displayName: "Member",
      createdAt: "2026-07-22T00:00:00.000Z",
      id: "member-id",
      role: "owner",
      updatedAt: "2026-07-22T00:00:00.000Z",
      userId: "user-id",
      workspaceId: "workspace-id",
    },
    myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
    projectData: [
      {
        matrix: { cells: [], columns: [], stages: [] },
        projectId: "project-id",
        projectKey: "ALB",
        projectTitle: "Album",
        projectless: false,
        table: { items: [], page: 1, pageSize: 50, total: 0 },
        tasks,
      },
    ],
    projects: [],
    statuses: [],
    taskSkills: [],
    views: [],
    workspace: {
      createdAt: "2026-07-22T00:00:00.000Z",
      description: null,
      id: "workspace-id",
      members: [],
      name,
      slug: "workspace",
      updatedAt: "2026-07-22T00:00:00.000Z",
    },
  };
}

function task(
  id: string,
  title: string,
): WorkspaceBootstrap["projectData"][number]["tasks"][number] {
  return {
    archivedAt: null,
    assigneeUserId: null,
    createdAt: "2026-07-22T00:00:00.000Z",
    createdByUserId: "user-id",
    description: null,
    dueAt: null,
    id,
    metadata: {},
    number: 1,
    parentTaskId: null,
    position: "1000",
    projectId: "project-id",
    sourceSkillId: null,
    sourceSkillVersionId: null,
    statusId: null,
    title,
    updatedAt: "2026-07-22T00:00:00.000Z",
    workspaceId: "workspace-id",
  };
}
