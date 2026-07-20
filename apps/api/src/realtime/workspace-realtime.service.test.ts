import assert from "node:assert/strict";
import test from "node:test";
import { filter, firstValueFrom } from "rxjs";
import { WorkspaceRealtimeEventDto } from "./realtime.dto.js";
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
  service.publishChange({ workspaceId, projectId, taskId });
  const message = await messagePromise;
  assert.ok(message.data instanceof WorkspaceRealtimeEventDto);
  assert.equal(message.data.kind, "changed");
  assert.equal(message.data.projectId, projectId);
  assert.equal(message.data.taskId, taskId);
});
