import assert from "node:assert/strict";
import test from "node:test";
import type { TaskActivityEvent } from "@task/api-client";
import { formatActivityTime, formatTaskActivity, isTaskActivityEvent } from "./task-activity.ts";

const context = {
  memberName: (userId: string): string | null => (userId === "user-2" ? "Мария" : null),
  statusName: (statusId: string): string | null => (statusId === "status-2" ? "Review" : null),
};

test("formats status and assignee activity using workspace names", () => {
  assert.equal(
    formatTaskActivity(event("task.status_updated", { statusId: "status-2" }), context),
    "изменил(а) статус на «Review»",
  );
  assert.equal(
    formatTaskActivity(event("task.assignee_updated", { assigneeUserId: "user-2" }), context),
    "назначил(а) исполнителя Мария",
  );
});

test("formats task detail changes", () => {
  assert.equal(
    formatTaskActivity(event("task.updated", { fields: ["title"] }), context),
    "изменил(а) название задачи",
  );
  assert.equal(
    formatTaskActivity(event("task.updated", { fields: ["description"] }), context),
    "изменил(а) описание задачи",
  );
});

test("formats relative activity time", () => {
  assert.equal(
    formatActivityTime("2026-07-19T11:59:00.000Z", new Date("2026-07-19T12:00:00.000Z")),
    "1 минуту назад",
  );
});

test("validates activity payloads at the fetch boundary", () => {
  assert.equal(isTaskActivityEvent(event("task.created", { title: "Задача" })), true);
  assert.equal(isTaskActivityEvent({ eventType: "task.created" }), false);
});

function event(eventType: string, payload: Record<string, unknown>): TaskActivityEvent {
  return {
    actorUserId: "user-1",
    createdAt: "2026-07-19T12:00:00.000Z",
    entityId: "task-1",
    entityType: "task",
    eventType,
    id: `event-${eventType}`,
    payload,
  };
}
