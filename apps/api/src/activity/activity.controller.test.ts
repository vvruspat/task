import assert from "node:assert/strict";
import test from "node:test";
import type { TaskActivityEvent } from "./activity.contracts.js";
import { ActivityController } from "./activity.controller.js";
import { ActivityService } from "./activity.service.js";
import type { TaskActivityStore } from "./activity.store.js";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "33333333-3333-4333-8333-333333333333";
const taskId = "44444444-4444-4444-8444-444444444444";
const userId = "22222222-2222-4222-8222-222222222222";

test("ActivityController uses trusted current user context for task history reads", async () => {
  const controller = new ActivityController(
    new ActivityService({
      listForTask: async (
        receivedWorkspaceId: string,
        receivedProjectId: string,
        receivedTaskId: string,
        receivedUserId: string,
      ): Promise<TaskActivityEvent[] | null> => {
        assert.equal(receivedWorkspaceId, workspaceId);
        assert.equal(receivedProjectId, projectId);
        assert.equal(receivedTaskId, taskId);
        assert.equal(receivedUserId, userId);
        return [];
      },
    } satisfies TaskActivityStore),
  );

  assert.deepEqual(await controller.listTaskActivity(workspaceId, projectId, taskId, userId), []);
});
