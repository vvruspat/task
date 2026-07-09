import assert from "node:assert/strict";
import test from "node:test";
import {
  parseUserSummaryToolInput,
  type UserSummaryAssignedTask,
  type UserSummaryMember,
  type UserSummaryToolInput,
  type UserSummaryToolResponse,
} from "./index.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const userId = "55555555-5555-4555-8555-555555555555";
const targetUserId = "77777777-7777-4777-8777-777777777777";

test("package entrypoint exports user summary contracts", () => {
  const input: UserSummaryToolInput = parseUserSummaryToolInput({
    workspaceId,
    userId,
    targetUserId,
  });
  const member: UserSummaryMember = {
    userId: targetUserId,
    role: "member",
    displayName: "Sam",
    email: null,
    avatarUrl: null,
  };
  const task: UserSummaryAssignedTask = {
    id: "66666666-6666-4666-8666-666666666666",
    projectId: "22222222-2222-4222-8222-222222222222",
    projectTitle: "Album Release",
    parentTaskId: null,
    title: "Record bass",
    statusId: null,
    statusName: null,
    isDone: false,
    dueAt: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const response: UserSummaryToolResponse = {
    user: member,
    counts: {
      assignedTasks: 1,
      openAssignedTasks: 1,
      doneAssignedTasks: 0,
      dueAssignedTasks: 0,
      projectsWithAssignedTasks: 1,
    },
    recentAssignedTasks: [task],
  };

  assert.deepEqual(input, { workspaceId, userId, targetUserId });
  assert.equal(response.user.userId, targetUserId);
});
