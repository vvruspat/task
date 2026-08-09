import assert from "node:assert/strict";
import test from "node:test";
import {
  containsVisibleInternalIdentifier,
  sanitizeUserFacingAgentResponse,
} from "./user-facing-agent-response.js";

test("sanitizeUserFacingAgentResponse hides visible UUIDs", () => {
  assert.equal(
    sanitizeUserFacingAgentResponse(
      "Пользователь 34755276-06a2-4133-b263-361d6efd7123 назначен на задачу.",
    ),
    "Пользователь [служебный идентификатор скрыт] назначен на задачу.",
  );
});

test("sanitizeUserFacingAgentResponse hides shortened UUIDs", () => {
  assert.equal(
    sanitizeUserFacingAgentResponse("ID пользователя: 34755276-... или c973cab3-2fd9-…"),
    "ID пользователя: [служебный идентификатор скрыт] или [служебный идентификатор скрыт]",
  );
});

test("sanitizeUserFacingAgentResponse preserves UUIDs in hidden Markdown destinations", () => {
  assert.equal(
    sanitizeUserFacingAgentResponse(
      "Открой [задачу ZNA-26](/projects/44444444-4444-4444-8444-444444444444/tasks/55555555-5555-4555-8555-555555555555).",
    ),
    "Открой [задачу ZNA-26](/projects/44444444-4444-4444-8444-444444444444/tasks/55555555-5555-4555-8555-555555555555).",
  );
});

test("containsVisibleInternalIdentifier ignores hidden Markdown destinations", () => {
  assert.equal(containsVisibleInternalIdentifier("Пользователь 34755276-..."), true);
  assert.equal(
    containsVisibleInternalIdentifier(
      "[задача ZNA-26](/tasks/55555555-5555-4555-8555-555555555555)",
    ),
    false,
  );
});
