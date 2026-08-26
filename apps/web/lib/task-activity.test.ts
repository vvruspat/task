import assert from "node:assert/strict";
import test from "node:test";
import type { TaskActivityEvent } from "@task/api-client";
import { type MessageKey, ru } from "./i18n/messages.ts";
import { formatActivityTime, formatTaskActivity, isTaskActivityEvent } from "./task-activity.ts";

const context = {
  locale: "ru" as const,
  memberName: (userId: string): string | null => (userId === "user-2" ? "Мария" : null),
  statusName: (statusId: string): string | null => (statusId === "status-2" ? "Review" : null),
  t: (key: MessageKey, values?: Readonly<Record<string, string | number>>): string => {
    const template = ru[key];
    if (values === undefined) return template;
    return template.replace(/\{\{(\w+)\}\}/gu, (match, name: string): string => {
      const value = values[name];
      return value === undefined ? match : String(value);
    });
  },
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

test("formats Google Drive file activity from provider metadata", () => {
  assert.equal(
    formatTaskActivity(
      event("integration.google_drive.resource_added", { resourceName: "brief.pdf" }),
      context,
    ),
    "добавил(а) «brief.pdf» через Google Drive",
  );
  assert.equal(
    formatTaskActivity(
      event("integration.google_drive.resource_removed", { resourceName: "brief.pdf" }),
      context,
    ),
    "удалил(а) «brief.pdf» из Google Drive",
  );
});

test("formats Yandex Disk file activity from provider metadata", () => {
  assert.equal(
    formatTaskActivity(
      event("integration.yandex_disk.resource_added", { resourceName: "brief.pdf" }),
      context,
    ),
    "добавил(а) «brief.pdf» через Яндекс Диск",
  );
  assert.equal(
    formatTaskActivity(
      event("integration.yandex_disk.resource_changed", { resourceName: "brief.pdf" }),
      context,
    ),
    "обновил(а) «brief.pdf» в Яндекс Диске",
  );
  assert.equal(
    formatTaskActivity(
      event("integration.yandex_disk.resource_removed", { resourceName: "brief.pdf" }),
      context,
    ),
    "удалил(а) «brief.pdf» из Яндекс Диска",
  );
});

test("formats relative activity time", () => {
  assert.equal(
    formatActivityTime("2026-07-19T11:59:00.000Z", "ru", new Date("2026-07-19T12:00:00.000Z")),
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
