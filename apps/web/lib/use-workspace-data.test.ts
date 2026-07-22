import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceBootstrap } from "./workspace-contracts.ts";
import {
  applyWorkspaceMemberRealtimeChange,
  createWorkspaceRealtimeConnectionLifecycle,
  findFallbackWorkspaceId,
  markWorkspaceRealtimeConnected,
  markWorkspaceRealtimeInterrupted,
  parseWorkspaceRealtimeChange,
} from "./workspace-realtime.ts";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222222";
const currentMemberId = "33333333-3333-4333-8333-333333333333";
const otherMemberId = "44444444-4444-4444-8444-444444444444";
const occurredAt = "2026-07-19T18:00:00.000Z";

function createWorkspaceBootstrap(): WorkspaceBootstrap {
  const currentMember: WorkspaceBootstrap["currentMember"] = {
    id: currentMemberId,
    workspaceId,
    userId: "55555555-5555-4555-8555-555555555555",
    role: "member",
    displayName: "Helen Belova",
    email: "helen@example.com",
    avatarUrl: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
  const otherMember: WorkspaceBootstrap["workspace"]["members"][number] = {
    id: otherMemberId,
    workspaceId,
    userId: "66666666-6666-4666-8666-666666666666",
    role: "guest",
    displayName: "Other Member",
    email: "other@example.com",
    avatarUrl: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
  return {
    availableWorkspaces: [
      {
        id: workspaceId,
        name: "Current",
        slug: "current",
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
      {
        id: otherWorkspaceId,
        name: "Fallback",
        slug: "fallback",
        createdAt: occurredAt,
        updatedAt: occurredAt,
      },
    ],
    currentMember,
    myTasks: { items: [], page: 1, pageSize: 50, total: 0 },
    projects: [],
    statuses: [],
    taskSkills: [],
    confirmations: [],
    agentRuns: [],
    workspace: {
      id: workspaceId,
      name: "Current",
      slug: "current",
      description: null,
      members: [currentMember, otherMember],
      createdAt: occurredAt,
      updatedAt: occurredAt,
    },
    projectData: [],
    views: [],
  };
}

test("parseWorkspaceRealtimeChange validates task-scoped SSE payloads", () => {
  assert.deepEqual(
    parseWorkspaceRealtimeChange(
      JSON.stringify({
        id: "1-1",
        kind: "changed",
        workspaceId: "11111111-1111-4111-8111-111111111111",
        projectId: "22222222-2222-4222-8222-222222222222",
        taskId: "33333333-3333-4333-8333-333333333333",
        mutationKind: "updated",
        occurredAt: "2026-07-19T18:00:00.000Z",
      }),
    ),
    {
      id: "1-1",
      kind: "changed",
      workspaceId,
      projectId: "22222222-2222-4222-8222-222222222222",
      taskId: "33333333-3333-4333-8333-333333333333",
      memberId: null,
      memberUserId: null,
      memberRole: null,
      mutationKind: "updated",
      occurredAt,
    },
  );
  assert.equal(parseWorkspaceRealtimeChange("{}"), null);
  assert.equal(parseWorkspaceRealtimeChange("not json"), null);
  assert.equal(
    parseWorkspaceRealtimeChange(
      JSON.stringify({
        id: "1-2",
        kind: "changed",
        workspaceId,
        projectId: null,
        taskId: null,
        mutationKind: "renamed",
        occurredAt,
      }),
    ),
    null,
  );
});

test("parseWorkspaceRealtimeChange validates member role and removal payloads", () => {
  assert.deepEqual(
    parseWorkspaceRealtimeChange(
      JSON.stringify({
        id: "2-1",
        kind: "member_role_changed",
        workspaceId,
        memberId: currentMemberId,
        memberUserId: "55555555-5555-4555-8555-555555555555",
        memberRole: "admin",
        occurredAt,
      }),
    ),
    {
      id: "2-1",
      kind: "member_role_changed",
      workspaceId,
      projectId: null,
      taskId: null,
      memberId: currentMemberId,
      memberUserId: "55555555-5555-4555-8555-555555555555",
      memberRole: "admin",
      mutationKind: null,
      occurredAt,
    },
  );
  assert.equal(
    parseWorkspaceRealtimeChange(
      JSON.stringify({
        id: "2-2",
        kind: "member_removed",
        workspaceId,
        memberId: currentMemberId,
        memberUserId: "55555555-5555-4555-8555-555555555555",
        memberRole: "invalid",
        occurredAt,
      }),
    ),
    null,
  );
});

test("applyWorkspaceMemberRealtimeChange updates the current role immediately", () => {
  const updated = applyWorkspaceMemberRealtimeChange(createWorkspaceBootstrap(), {
    id: "3-1",
    kind: "member_role_changed",
    workspaceId,
    projectId: null,
    taskId: null,
    memberId: currentMemberId,
    memberUserId: "55555555-5555-4555-8555-555555555555",
    memberRole: "admin",
    mutationKind: null,
    occurredAt,
  });

  assert.equal(updated.currentMember.role, "admin");
  assert.equal(updated.workspace.members[0]?.role, "admin");
});

test("applyWorkspaceMemberRealtimeChange removes another member from the visible list", () => {
  const updated = applyWorkspaceMemberRealtimeChange(createWorkspaceBootstrap(), {
    id: "4-1",
    kind: "member_removed",
    workspaceId,
    projectId: null,
    taskId: null,
    memberId: otherMemberId,
    memberUserId: "66666666-6666-4666-8666-666666666666",
    memberRole: "guest",
    mutationKind: null,
    occurredAt,
  });

  assert.deepEqual(
    updated.workspace.members.map((member) => member.id),
    [currentMemberId],
  );
});

test("findFallbackWorkspaceId selects another workspace after removal", () => {
  const data = createWorkspaceBootstrap();
  assert.equal(findFallbackWorkspaceId(data, workspaceId), otherWorkspaceId);
  assert.equal(
    findFallbackWorkspaceId(
      { ...data, availableWorkspaces: data.availableWorkspaces.slice(0, 1) },
      workspaceId,
    ),
    null,
  );
});

test("workspace realtime lifecycle distinguishes initial connect from reconnect", () => {
  const initial = createWorkspaceRealtimeConnectionLifecycle();
  assert.deepEqual(initial, { hasConnected: false, status: "connecting" });

  const connected = markWorkspaceRealtimeConnected(initial);
  assert.equal(connected.reconnected, false);
  assert.deepEqual(connected.lifecycle, { hasConnected: true, status: "live" });

  const interrupted = markWorkspaceRealtimeInterrupted(connected.lifecycle, true);
  assert.deepEqual(interrupted, { hasConnected: true, status: "reconnecting" });
  const reconnected = markWorkspaceRealtimeConnected(interrupted);
  assert.equal(reconnected.reconnected, true);
  assert.deepEqual(reconnected.lifecycle, { hasConnected: true, status: "live" });
});

test("workspace realtime lifecycle reports offline browser state", () => {
  const lifecycle = markWorkspaceRealtimeInterrupted(
    createWorkspaceRealtimeConnectionLifecycle(),
    false,
  );
  assert.deepEqual(lifecycle, { hasConnected: false, status: "offline" });
});
