import assert from "node:assert/strict";
import test from "node:test";
import { notificationKindForEvent } from "./typeorm-notifications.store.js";

const currentUserId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const event = {
  actorUserId: currentUserId,
  createdAt: new Date("2026-07-19T20:00:00Z"),
  eventType: "task.updated",
  payload: {},
};

test("self mentions remain notifications while self-authored task changes are ignored", () => {
  assert.equal(notificationKindForEvent(event, currentUserId, true, undefined), "mention");
  assert.equal(
    notificationKindForEvent(event, currentUserId, false, new Date("2026-07-19T19:00:00Z")),
    null,
  );
});

test("task changes are delivered only after the user subscribed", () => {
  const otherUserEvent = { ...event, actorUserId: otherUserId };
  assert.equal(
    notificationKindForEvent(
      otherUserEvent,
      currentUserId,
      false,
      new Date("2026-07-19T19:00:00Z"),
    ),
    "task_changed",
  );
  assert.equal(
    notificationKindForEvent(
      otherUserEvent,
      currentUserId,
      false,
      new Date("2026-07-19T21:00:00Z"),
    ),
    null,
  );
});

test("new task assignments notify the assignee without requiring a subscription", () => {
  const assignment = {
    ...event,
    actorUserId: otherUserId,
    eventType: "task.assignee_updated",
    payload: { assigneeUserId: currentUserId, previousAssigneeUserId: null },
  };
  assert.equal(
    notificationKindForEvent(assignment, currentUserId, false, undefined),
    "task_assigned",
  );
  assert.equal(
    notificationKindForEvent(
      { ...assignment, eventType: "task.created" },
      currentUserId,
      false,
      undefined,
    ),
    "task_assigned",
  );
  assert.equal(
    notificationKindForEvent(
      { ...assignment, eventType: "task.bulk_updated" },
      currentUserId,
      false,
      undefined,
    ),
    "task_assigned",
  );
});

test("assignment notifications ignore repeated, removed, and self assignments", () => {
  const assignment = {
    ...event,
    actorUserId: otherUserId,
    eventType: "task.assignee_updated",
    payload: { assigneeUserId: currentUserId, previousAssigneeUserId: currentUserId },
  };
  assert.equal(notificationKindForEvent(assignment, currentUserId, false, undefined), null);
  assert.equal(
    notificationKindForEvent(
      { ...assignment, payload: { assigneeUserId: null, previousAssigneeUserId: currentUserId } },
      currentUserId,
      false,
      undefined,
    ),
    null,
  );
  assert.equal(
    notificationKindForEvent(
      {
        ...assignment,
        actorUserId: currentUserId,
        payload: { assigneeUserId: currentUserId, previousAssigneeUserId: null },
      },
      currentUserId,
      false,
      undefined,
    ),
    null,
  );
});
