import assert from "node:assert/strict";
import test from "node:test";
import { isNotificationFeed } from "./notifications.ts";

test("isNotificationFeed accepts task assignment notifications", () => {
  assert.equal(
    isNotificationFeed({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          kind: "task_assigned",
          taskId: "22222222-2222-4222-8222-222222222222",
          projectKey: "APP",
          taskNumber: 42,
          taskTitle: "Review release",
          eventType: "task.assignee_updated",
          createdAt: "2026-07-22T00:00:00.000Z",
          read: false,
        },
      ],
      unreadCount: 1,
      lastReadAt: null,
    }),
    true,
  );
});
