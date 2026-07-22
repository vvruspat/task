import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceDetail } from "@task/api-client";
import {
  canLeaveWorkspace,
  canManageWorkspaceMember,
  canManageWorkspaceSettings,
  findCurrentWorkspaceMember,
} from "./workspace-contracts.ts";

test("current workspace member is selected by authenticated user id, not list position", () => {
  const workspace: WorkspaceDetail = {
    createdAt: "2026-07-21T10:00:00.000Z",
    description: null,
    id: "11111111-1111-4111-8111-111111111111",
    members: [
      member("22222222-2222-4222-8222-222222222222", "Owner", "owner"),
      member("33333333-3333-4333-8333-333333333333", "Helen Belova", "admin"),
    ],
    name: "Studio",
    slug: "studio",
    updatedAt: "2026-07-21T10:00:00.000Z",
  };

  assert.equal(
    findCurrentWorkspaceMember(workspace, "33333333-3333-4333-8333-333333333333")?.displayName,
    "Helen Belova",
  );
});

test("workspace settings are available only to owners and administrators", () => {
  assert.equal(canManageWorkspaceSettings("owner"), true);
  assert.equal(canManageWorkspaceSettings("admin"), true);
  assert.equal(canManageWorkspaceSettings("member"), false);
  assert.equal(canManageWorkspaceSettings("guest"), false);
});

test("workspace administrators manage other non-owner members", () => {
  const admin = member("33333333-3333-4333-8333-333333333333", "Admin", "admin");
  const otherAdmin = member("44444444-4444-4444-8444-444444444444", "Other Admin", "admin");
  const regularMember = member("55555555-5555-4555-8555-555555555555", "Member", "member");
  const owner = member("66666666-6666-4666-8666-666666666666", "Owner", "owner");

  assert.equal(canManageWorkspaceMember(admin, otherAdmin), true);
  assert.equal(canManageWorkspaceMember(admin, regularMember), true);
  assert.equal(canManageWorkspaceMember(admin, admin), false);
  assert.equal(canManageWorkspaceMember(admin, owner), false);
  assert.equal(canManageWorkspaceMember(regularMember, otherAdmin), false);
});

test("all workspace roles except the owner can leave", () => {
  assert.equal(canLeaveWorkspace("owner"), false);
  assert.equal(canLeaveWorkspace("admin"), true);
  assert.equal(canLeaveWorkspace("member"), true);
  assert.equal(canLeaveWorkspace("guest"), true);
});

function member(
  userId: string,
  displayName: string,
  role: "admin" | "guest" | "member" | "owner",
): WorkspaceDetail["members"][number] {
  return {
    avatarUrl: null,
    createdAt: "2026-07-21T10:00:00.000Z",
    displayName,
    email: `${displayName.toLowerCase().replaceAll(" ", ".")}@example.com`,
    id: userId,
    role,
    updatedAt: "2026-07-21T10:00:00.000Z",
    userId,
    workspaceId: "11111111-1111-4111-8111-111111111111",
  };
}
