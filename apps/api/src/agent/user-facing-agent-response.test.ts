import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeUserFacingAgentResponse } from "./user-facing-agent-response.js";

test("sanitizeUserFacingAgentResponse hides visible UUIDs", () => {
  assert.equal(
    sanitizeUserFacingAgentResponse(
      "Пользователь 34755276-06a2-4133-b263-361d6efd7123 назначен на задачу.",
    ),
    "Пользователь [служебный идентификатор скрыт] назначен на задачу.",
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
