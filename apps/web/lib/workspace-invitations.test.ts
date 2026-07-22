import assert from "node:assert/strict";
import test from "node:test";
import {
  isAcceptInvitationResult,
  isInvitationPreview,
  isWorkspaceInvitation,
} from "./workspace-invitations.ts";

const workspace = {
  createdAt: "2026-07-21T10:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Studio",
  slug: "studio",
  updatedAt: "2026-07-21T10:00:00.000Z",
};

test("workspace invitation guards validate complete API payloads", () => {
  const invitation = {
    createdAt: workspace.createdAt,
    email: "teammate@example.com",
    expiresAt: "2026-07-28T10:00:00.000Z",
    id: "22222222-2222-4222-8222-222222222222",
    role: "member",
    status: "pending",
    workspaceId: workspace.id,
  };
  assert.equal(isWorkspaceInvitation(invitation), true);
  assert.equal(isWorkspaceInvitation({ ...invitation, role: "owner" }), false);
  assert.equal(isInvitationPreview({ ...invitation, workspaceName: workspace.name }), true);
});

test("accepted invitation guard validates workspace and member details", () => {
  assert.equal(
    isAcceptInvitationResult({
      workspace,
      member: {
        avatarUrl: null,
        createdAt: workspace.createdAt,
        displayName: "Teammate",
        email: "teammate@example.com",
        id: "33333333-3333-4333-8333-333333333333",
        role: "member",
        updatedAt: workspace.updatedAt,
        userId: "44444444-4444-4444-8444-444444444444",
        workspaceId: workspace.id,
      },
    }),
    true,
  );
  assert.equal(isAcceptInvitationResult({ workspace, member: { role: "member" } }), false);
});
