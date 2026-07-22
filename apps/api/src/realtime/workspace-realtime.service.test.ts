import assert from "node:assert/strict";
import test from "node:test";
import { Reflector } from "@nestjs/core";
import { filter, firstValueFrom } from "rxjs";
import { WorkspacesController } from "../workspaces/workspaces.controller.js";
import { workspaceMutationKindForMethod } from "./realtime.contracts.js";
import { WorkspaceRealtimeEventDto } from "./realtime.dto.js";
import { workspaceMemberChangeMetadataKey } from "./workspace-change.decorator.js";
import { readWorkspaceTaskResultId } from "./workspace-change.interceptor.js";
import { WorkspaceRealtimeService } from "./workspace-realtime.service.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const taskId = "33333333-3333-4333-8333-333333333333";

test("WorkspaceRealtimeService emits a connected event immediately", async () => {
  const service = new WorkspaceRealtimeService();
  const message = await firstValueFrom(service.subscribe(workspaceId));
  assert.equal(message.type, "workspace.connected");
  assert.ok(message.data instanceof WorkspaceRealtimeEventDto);
  assert.equal(message.data.workspaceId, workspaceId);
  assert.equal(message.data.kind, "connected");
});

test("WorkspaceRealtimeService publishes scoped task changes to active subscribers", async () => {
  const service = new WorkspaceRealtimeService();
  const messagePromise = firstValueFrom(
    service.subscribe(workspaceId).pipe(filter((message) => message.type === "workspace.changed")),
  );
  service.publishChange({ mutationKind: "updated", workspaceId, projectId, taskId });
  const message = await messagePromise;
  assert.ok(message.data instanceof WorkspaceRealtimeEventDto);
  assert.equal(message.data.kind, "changed");
  assert.equal(message.data.projectId, projectId);
  assert.equal(message.data.taskId, taskId);
  assert.equal(message.data.mutationKind, "updated");
});

test("workspace mutation kinds preserve create, update, and delete intent", () => {
  assert.equal(workspaceMutationKindForMethod("POST"), "created");
  assert.equal(workspaceMutationKindForMethod("patch"), "updated");
  assert.equal(workspaceMutationKindForMethod("PUT"), "updated");
  assert.equal(workspaceMutationKindForMethod("DELETE"), "deleted");
});

test("created task responses contribute their generated id to realtime events", () => {
  assert.equal(
    readWorkspaceTaskResultId({
      id: taskId,
      workspaceId,
      projectId,
      number: 42,
      position: "1000",
    }),
    taskId,
  );
  assert.equal(readWorkspaceTaskResultId({ id: projectId, workspaceId, position: "1000" }), null);
});

test("WorkspaceRealtimeService publishes member role changes", async () => {
  const service = new WorkspaceRealtimeService();
  const messagePromise = firstValueFrom(
    service
      .subscribe(workspaceId)
      .pipe(filter((message) => message.type === "workspace.member_role_changed")),
  );
  service.publishMemberRoleChanged({
    workspaceId,
    memberId: "44444444-4444-4444-8444-444444444444",
    memberUserId: "55555555-5555-4555-8555-555555555555",
    memberRole: "admin",
  });
  const message = await messagePromise;
  assert.ok(message.data instanceof WorkspaceRealtimeEventDto);
  assert.equal(message.data.kind, "member_role_changed");
  assert.equal(message.data.memberRole, "admin");
});

test("WorkspaceRealtimeService publishes member removals", async () => {
  const service = new WorkspaceRealtimeService();
  const messagePromise = firstValueFrom(
    service
      .subscribe(workspaceId)
      .pipe(filter((message) => message.type === "workspace.member_removed")),
  );
  service.publishMemberRemoved({
    workspaceId,
    memberId: "44444444-4444-4444-8444-444444444444",
    memberUserId: "55555555-5555-4555-8555-555555555555",
    memberRole: "member",
  });
  const message = await messagePromise;
  assert.ok(message.data instanceof WorkspaceRealtimeEventDto);
  assert.equal(message.data.kind, "member_removed");
  assert.equal(message.data.memberUserId, "55555555-5555-4555-8555-555555555555");
});

test("workspace member mutations declare specialized realtime events", () => {
  const reflector = new Reflector();
  assert.equal(
    reflector.get(
      workspaceMemberChangeMetadataKey,
      WorkspacesController.prototype.updateMemberRole,
    ),
    "member_role_changed",
  );
  assert.equal(
    reflector.get(workspaceMemberChangeMetadataKey, WorkspacesController.prototype.removeMember),
    "member_removed",
  );
});
