import assert from "node:assert/strict";
import test from "node:test";
import { NotFoundException } from "@nestjs/common";
import type { TaskActivityEvent } from "./activity.contracts.js";
import { TaskActivityEventDto } from "./activity.dto.js";
import { ActivityService } from "./activity.service.js";
import type { TaskActivityStore } from "./activity.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const userId = "22222222-2222-4222-8222-222222222222";
const event: TaskActivityEvent = {
  id: "55555555-5555-4555-8555-555555555555",
  actorUserId: userId,
  eventType: "task.updated",
  entityId: taskId,
  entityType: "task",
  payload: { projectId },
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

test("ActivityService maps activity for visible tasks", async () => {
  const service = new ActivityService(createStore([event]));

  const response = await service.listTaskActivity(workspaceId, projectId, taskId, userId);

  assert.equal(response.length, 1);
  assert.ok(response[0] instanceof TaskActivityEventDto);
  assert.deepEqual(response[0]?.payload, { projectId });
});

test("ActivityService hides inaccessible task activity", async () => {
  const service = new ActivityService(createStore(null));

  await assert.rejects(
    () => service.listTaskActivity(workspaceId, projectId, taskId, userId),
    NotFoundException,
  );
});

function createStore(events: TaskActivityEvent[] | null): TaskActivityStore {
  return { listForTask: async (): Promise<TaskActivityEvent[] | null> => events };
}
