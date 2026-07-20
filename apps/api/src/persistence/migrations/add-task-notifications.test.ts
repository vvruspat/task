import assert from "node:assert/strict";
import test from "node:test";
import {
  addTaskNotificationsSql,
  dropTaskNotificationsSql,
} from "./1783297260000-add-task-notifications.js";

test("task notification migration stores subscriptions and per-user read state", () => {
  const sql = addTaskNotificationsSql.join("\n");
  assert.match(sql, /CREATE TABLE "task_subscriptions"/);
  assert.match(sql, /PRIMARY KEY \("workspace_id", "task_id", "user_id"\)/);
  assert.match(sql, /CREATE TABLE "notification_read_states"/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.deepEqual(dropTaskNotificationsSql, [
    'DROP TABLE "notification_read_states"',
    'DROP TABLE "task_subscriptions"',
  ]);
});
