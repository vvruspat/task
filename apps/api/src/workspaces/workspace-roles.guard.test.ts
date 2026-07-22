import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { WorkspaceInvitationsController } from "../invitations/invitations.controller.js";
import type { WorkspaceMemberRole } from "../persistence/types/core-persistence.types.js";
import { WorkspaceRoles, workspaceRolesMetadataKey } from "./workspace-roles.decorator.js";
import { isWorkspaceRoleAllowed, parseWorkspaceId } from "./workspace-roles.guard.js";
import { WorkspacesController } from "./workspaces.controller.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";

test("WorkspaceRoles stores typed role metadata on controller methods", () => {
  class ExampleController {
    @WorkspaceRoles("owner", "admin")
    update(): void {}
  }

  const roles = new Reflector().get<readonly WorkspaceMemberRole[]>(
    workspaceRolesMetadataKey,
    ExampleController.prototype.update,
  );
  assert.deepEqual(roles, ["owner", "admin"]);
});

test("workspace management endpoints declare their guard roles", () => {
  const reflector = new Reflector();
  assert.deepEqual(
    reflector.get<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      WorkspacesController.prototype.updateWorkspace,
    ),
    ["owner", "admin"],
  );
  assert.deepEqual(
    reflector.get<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      WorkspacesController.prototype.removeMember,
    ),
    ["owner", "admin", "member", "guest"],
  );
  assert.deepEqual(
    reflector.get<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      WorkspacesController.prototype.deleteWorkspace,
    ),
    ["owner"],
  );
  assert.deepEqual(
    reflector.get<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      WorkspacesController.prototype.updateMemberRole,
    ),
    ["owner", "admin"],
  );
  assert.deepEqual(
    reflector.get<readonly WorkspaceMemberRole[]>(
      workspaceRolesMetadataKey,
      WorkspaceInvitationsController,
    ),
    ["owner", "admin"],
  );
});

test("workspace role authorization permits only declared roles", () => {
  const managers: readonly WorkspaceMemberRole[] = ["owner", "admin"];
  assert.equal(isWorkspaceRoleAllowed(managers, "owner"), true);
  assert.equal(isWorkspaceRoleAllowed(managers, "admin"), true);
  assert.equal(isWorkspaceRoleAllowed(managers, "member"), false);
  assert.equal(isWorkspaceRoleAllowed(managers, "guest"), false);
  assert.equal(isWorkspaceRoleAllowed(managers, null), false);
});

test("workspace role guard validates the route workspace id", () => {
  assert.equal(parseWorkspaceId(workspaceId), workspaceId);
  assert.throws(() => parseWorkspaceId(undefined), BadRequestException);
  assert.throws(() => parseWorkspaceId("not-a-workspace-id"), BadRequestException);
});
